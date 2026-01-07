// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ConditionalTokens.sol";

/**
 * @title MarketFactory
 * @notice Factory contract for creating and managing prediction markets
 */
contract MarketFactory is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // References
    ConditionalTokens public immutable conditionalTokens;
    IERC20 public immutable collateralToken;

    // Market parameters
    uint256 public marketCreationStake; // Stake required to create market
    uint256 public minInitialLiquidity; // Minimum initial liquidity
    uint256 public platformFee; // Fee in basis points (150 = 1.5%)
    address public feeRecipient;

    // Market structure
    struct Market {
        bytes32 conditionId;
        string question;
        string description;
        string category;
        address creator;
        uint256 createdAt;
        uint256 resolutionTime;
        string resolutionSource;
        MarketStatus status;
        uint256 totalVolume;
        uint256 yesLiquidity;
        uint256 noLiquidity;
    }

    enum MarketStatus {
        Active,
        Resolved,
        Disputed,
        Cancelled
    }

    // Storage
    mapping(bytes32 => Market) public markets;
    bytes32[] public marketIds;
    mapping(address => bytes32[]) public creatorMarkets;
    mapping(string => bool) public questionExists; // Prevent duplicate questions

    // Events
    event MarketCreated(
        bytes32 indexed conditionId,
        address indexed creator,
        string question,
        string category,
        uint256 resolutionTime
    );

    event MarketResolved(
        bytes32 indexed conditionId,
        uint256 outcome,
        uint256 timestamp
    );

    event MarketDisputed(
        bytes32 indexed conditionId,
        address indexed disputer,
        string reason
    );

    event LiquidityAdded(
        bytes32 indexed conditionId,
        address indexed provider,
        uint256 amount
    );

    event VolumeUpdated(
        bytes32 indexed conditionId,
        uint256 newVolume
    );

    event ParametersUpdated(
        uint256 marketCreationStake,
        uint256 minInitialLiquidity,
        uint256 platformFee
    );

    constructor(
        address _conditionalTokens,
        address _collateralToken,
        uint256 _marketCreationStake,
        uint256 _minInitialLiquidity,
        uint256 _platformFee,
        address _feeRecipient
    ) Ownable(msg.sender) {
        require(_conditionalTokens != address(0), "Invalid CTF address");
        require(_collateralToken != address(0), "Invalid collateral");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_platformFee <= 1000, "Fee too high"); // Max 10%

        conditionalTokens = ConditionalTokens(_conditionalTokens);
        collateralToken = IERC20(_collateralToken);
        marketCreationStake = _marketCreationStake;
        minInitialLiquidity = _minInitialLiquidity;
        platformFee = _platformFee;
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Create a new prediction market
     * @param question The question to predict
     * @param description Detailed description
     * @param category Market category
     * @param resolutionTime When the market resolves
     * @param resolutionSource Source for resolution
     * @param initialLiquidity Initial liquidity to provide
     */
    function createMarket(
        string calldata question,
        string calldata description,
        string calldata category,
        uint256 resolutionTime,
        string calldata resolutionSource,
        uint256 initialLiquidity
    ) external nonReentrant returns (bytes32) {
        require(bytes(question).length > 0 && bytes(question).length <= 200, "Invalid question length");
        require(!questionExists[question], "Question already exists");
        require(resolutionTime > block.timestamp, "Resolution time must be in future");
        require(initialLiquidity >= minInitialLiquidity, "Insufficient initial liquidity");

        // Collect creation stake
        if (marketCreationStake > 0) {
            collateralToken.safeTransferFrom(msg.sender, address(this), marketCreationStake);
        }

        // Generate unique question ID
        bytes32 questionId = keccak256(abi.encodePacked(
            question,
            block.timestamp,
            msg.sender
        ));

        // Prepare condition in CTF
        bytes32 conditionId = conditionalTokens.prepareCondition(questionId, address(this));

        // Create market
        markets[conditionId] = Market({
            conditionId: conditionId,
            question: question,
            description: description,
            category: category,
            creator: msg.sender,
            createdAt: block.timestamp,
            resolutionTime: resolutionTime,
            resolutionSource: resolutionSource,
            status: MarketStatus.Active,
            totalVolume: 0,
            yesLiquidity: initialLiquidity,
            noLiquidity: initialLiquidity
        });

        marketIds.push(conditionId);
        creatorMarkets[msg.sender].push(conditionId);
        questionExists[question] = true;

        // Add initial liquidity
        _addInitialLiquidity(conditionId, initialLiquidity);

        emit MarketCreated(conditionId, msg.sender, question, category, resolutionTime);

        return conditionId;
    }

    /**
     * @notice Add initial liquidity to a new market
     */
    function _addInitialLiquidity(bytes32 conditionId, uint256 amount) private {
        // Transfer collateral from creator
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        // Approve CTF to spend collateral
        collateralToken.approve(address(conditionalTokens), amount);

        // Split into YES and NO tokens
        conditionalTokens.splitPosition(conditionId, amount);

        emit LiquidityAdded(conditionId, msg.sender, amount);
    }

    /**
     * @notice Resolve a market
     * @param conditionId The market to resolve
     * @param outcome The winning outcome (0 = NO, 1 = YES)
     */
    function resolveMarket(bytes32 conditionId, uint256 outcome) external onlyOwner {
        Market storage market = markets[conditionId];
        require(market.status == MarketStatus.Active, "Market not active");
        require(block.timestamp >= market.resolutionTime, "Resolution time not reached");
        require(outcome <= 1, "Invalid outcome");

        // Resolve in CTF
        conditionalTokens.resolveCondition(conditionId, outcome);

        // Update market status
        market.status = MarketStatus.Resolved;

        // Return creation stake to creator
        if (marketCreationStake > 0) {
            collateralToken.safeTransfer(market.creator, marketCreationStake);
        }

        emit MarketResolved(conditionId, outcome, block.timestamp);
    }

    /**
     * @notice Dispute a market resolution
     * @param conditionId The market to dispute
     * @param reason Dispute reason
     */
    function disputeMarket(bytes32 conditionId, string calldata reason) external {
        Market storage market = markets[conditionId];
        require(market.status == MarketStatus.Active, "Market not active");
        require(block.timestamp >= market.resolutionTime &&
                block.timestamp <= market.resolutionTime + 48 hours, "Dispute period expired");

        market.status = MarketStatus.Disputed;

        emit MarketDisputed(conditionId, msg.sender, reason);
    }

    /**
     * @notice Update market volume (called by trading contracts)
     * @param conditionId The market
     * @param volume Volume to add
     */
    function updateVolume(bytes32 conditionId, uint256 volume) external {
        // In production, this should be restricted to authorized trading contracts
        markets[conditionId].totalVolume += volume;
        emit VolumeUpdated(conditionId, markets[conditionId].totalVolume);
    }

    /**
     * @notice Update platform parameters
     */
    function updateParameters(
        uint256 _marketCreationStake,
        uint256 _minInitialLiquidity,
        uint256 _platformFee
    ) external onlyOwner {
        require(_platformFee <= 1000, "Fee too high");

        marketCreationStake = _marketCreationStake;
        minInitialLiquidity = _minInitialLiquidity;
        platformFee = _platformFee;

        emit ParametersUpdated(_marketCreationStake, _minInitialLiquidity, _platformFee);
    }

    /**
     * @notice Update fee recipient
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Get market by ID
     */
    function getMarket(bytes32 conditionId) external view returns (Market memory) {
        return markets[conditionId];
    }

    /**
     * @notice Get all market IDs
     */
    function getAllMarketIds() external view returns (bytes32[] memory) {
        return marketIds;
    }

    /**
     * @notice Get markets created by an address
     */
    function getCreatorMarkets(address creator) external view returns (bytes32[] memory) {
        return creatorMarkets[creator];
    }

    /**
     * @notice Get total number of markets
     */
    function getMarketCount() external view returns (uint256) {
        return marketIds.length;
    }
}
