// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ConditionalTokens
 * @notice Core contract for creating and managing conditional tokens (YES/NO tokens)
 * @dev Implements ERC1155 for efficient token management
 */
contract ConditionalTokens is ERC1155, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Collateral token (USDC)
    IERC20 public immutable collateralToken;

    // Market condition structure
    struct Condition {
        bytes32 questionId;
        uint256 outcomeSlotCount; // Always 2 for YES/NO
        address oracle;
        uint256 payoutNumerator; // 0 = NO wins, 1 = YES wins, 2 = undecided
        bool resolved;
    }

    // Storage
    mapping(bytes32 => Condition) public conditions;
    mapping(bytes32 => mapping(uint256 => uint256)) public positionIds; // conditionId => outcome => tokenId

    // Events
    event ConditionPrepared(
        bytes32 indexed conditionId,
        bytes32 indexed questionId,
        address indexed oracle,
        uint256 outcomeSlotCount
    );

    event ConditionResolved(
        bytes32 indexed conditionId,
        uint256 payoutNumerator
    );

    event PositionSplit(
        address indexed user,
        bytes32 indexed conditionId,
        uint256 amount,
        uint256 yesTokenId,
        uint256 noTokenId
    );

    event PositionMerged(
        address indexed user,
        bytes32 indexed conditionId,
        uint256 amount,
        uint256 yesTokenId,
        uint256 noTokenId
    );

    event PayoutRedeemed(
        address indexed user,
        bytes32 indexed conditionId,
        uint256 amount
    );

    constructor(address _collateralToken) ERC1155("https://api.polymarket-bsc.com/tokens/{id}.json") Ownable(msg.sender) {
        require(_collateralToken != address(0), "Invalid collateral token");
        collateralToken = IERC20(_collateralToken);
    }

    /**
     * @notice Prepare a new condition (market)
     * @param questionId Unique identifier for the question
     * @param oracle Address that will resolve the condition
     */
    function prepareCondition(bytes32 questionId, address oracle) external returns (bytes32) {
        require(oracle != address(0), "Invalid oracle");

        bytes32 conditionId = keccak256(abi.encodePacked(questionId, oracle));
        require(conditions[conditionId].oracle == address(0), "Condition already exists");

        conditions[conditionId] = Condition({
            questionId: questionId,
            outcomeSlotCount: 2, // YES/NO
            oracle: oracle,
            payoutNumerator: 2, // Undecided
            resolved: false
        });

        // Generate token IDs for YES and NO outcomes
        positionIds[conditionId][0] = uint256(keccak256(abi.encodePacked(conditionId, uint256(0)))); // NO token
        positionIds[conditionId][1] = uint256(keccak256(abi.encodePacked(conditionId, uint256(1)))); // YES token

        emit ConditionPrepared(conditionId, questionId, oracle, 2);

        return conditionId;
    }

    /**
     * @notice Split collateral into YES and NO tokens
     * @param conditionId The condition ID
     * @param amount Amount of collateral to split
     */
    function splitPosition(bytes32 conditionId, uint256 amount) external nonReentrant {
        require(!conditions[conditionId].resolved, "Condition already resolved");
        require(amount > 0, "Amount must be greater than 0");

        // Transfer collateral from user
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 yesTokenId = positionIds[conditionId][1];
        uint256 noTokenId = positionIds[conditionId][0];

        // Mint YES and NO tokens
        _mint(msg.sender, yesTokenId, amount, "");
        _mint(msg.sender, noTokenId, amount, "");

        emit PositionSplit(msg.sender, conditionId, amount, yesTokenId, noTokenId);
    }

    /**
     * @notice Merge YES and NO tokens back into collateral
     * @param conditionId The condition ID
     * @param amount Amount of tokens to merge
     */
    function mergePositions(bytes32 conditionId, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        uint256 yesTokenId = positionIds[conditionId][1];
        uint256 noTokenId = positionIds[conditionId][0];

        // Burn YES and NO tokens
        _burn(msg.sender, yesTokenId, amount);
        _burn(msg.sender, noTokenId, amount);

        // Return collateral to user
        collateralToken.safeTransfer(msg.sender, amount);

        emit PositionMerged(msg.sender, conditionId, amount, yesTokenId, noTokenId);
    }

    /**
     * @notice Resolve a condition
     * @param conditionId The condition ID
     * @param outcome The winning outcome (0 = NO, 1 = YES)
     */
    function resolveCondition(bytes32 conditionId, uint256 outcome) external {
        Condition storage condition = conditions[conditionId];
        require(msg.sender == condition.oracle, "Only oracle can resolve");
        require(!condition.resolved, "Already resolved");
        require(outcome <= 1, "Invalid outcome");

        condition.payoutNumerator = outcome;
        condition.resolved = true;

        emit ConditionResolved(conditionId, outcome);
    }

    /**
     * @notice Redeem winning tokens for collateral
     * @param conditionId The condition ID
     */
    function redeemPositions(bytes32 conditionId) external nonReentrant {
        Condition memory condition = conditions[conditionId];
        require(condition.resolved, "Condition not resolved");

        uint256 winningTokenId = positionIds[conditionId][condition.payoutNumerator];
        uint256 winningBalance = balanceOf(msg.sender, winningTokenId);

        require(winningBalance > 0, "No winning tokens");

        // Burn winning tokens
        _burn(msg.sender, winningTokenId, winningBalance);

        // Transfer collateral
        collateralToken.safeTransfer(msg.sender, winningBalance);

        emit PayoutRedeemed(msg.sender, conditionId, winningBalance);
    }

    /**
     * @notice Get token IDs for a condition
     * @param conditionId The condition ID
     * @return yesTokenId The YES token ID
     * @return noTokenId The NO token ID
     */
    function getPositionIds(bytes32 conditionId) external view returns (uint256 yesTokenId, uint256 noTokenId) {
        yesTokenId = positionIds[conditionId][1];
        noTokenId = positionIds[conditionId][0];
    }

    /**
     * @notice Check if a condition is resolved
     * @param conditionId The condition ID
     * @return resolved True if resolved
     * @return outcome The winning outcome
     */
    function getConditionResolution(bytes32 conditionId) external view returns (bool resolved, uint256 outcome) {
        Condition memory condition = conditions[conditionId];
        resolved = condition.resolved;
        outcome = condition.payoutNumerator;
    }

    /**
     * @notice Update token URI base
     * @param newuri New base URI
     */
    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
}
