// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../core/ConditionalTokens.sol";

/**
 * @title AMM
 * @notice Automated Market Maker for prediction markets using constant product formula
 * @dev Implements liquidity pools for YES/NO tokens
 */
contract AMM is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 private constant FEE_DENOMINATOR = 10000;
    uint256 private constant MIN_LIQUIDITY = 1000;

    // References
    ConditionalTokens public immutable conditionalTokens;
    IERC20 public immutable collateralToken;

    // Fee configuration
    uint256 public swapFee = 30; // 0.3% in basis points
    address public feeRecipient;

    // Liquidity pool structure
    struct Pool {
        bytes32 conditionId;
        uint256 yesReserve;
        uint256 noReserve;
        uint256 totalLiquidity;
        bool initialized;
    }

    // Storage
    mapping(bytes32 => Pool) public pools;
    mapping(bytes32 => mapping(address => uint256)) public liquidityBalance; // conditionId => provider => LP tokens

    // Events
    event PoolCreated(
        bytes32 indexed conditionId,
        uint256 yesReserve,
        uint256 noReserve
    );

    event LiquidityAdded(
        bytes32 indexed conditionId,
        address indexed provider,
        uint256 yesAmount,
        uint256 noAmount,
        uint256 liquidity
    );

    event LiquidityRemoved(
        bytes32 indexed conditionId,
        address indexed provider,
        uint256 yesAmount,
        uint256 noAmount,
        uint256 liquidity
    );

    event Swap(
        bytes32 indexed conditionId,
        address indexed trader,
        bool buyYes,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );

    event FeeUpdated(uint256 newFee);

    constructor(
        address _conditionalTokens,
        address _collateralToken,
        address _feeRecipient
    ) Ownable(msg.sender) {
        require(_conditionalTokens != address(0), "Invalid CTF");
        require(_collateralToken != address(0), "Invalid collateral");
        require(_feeRecipient != address(0), "Invalid fee recipient");

        conditionalTokens = ConditionalTokens(_conditionalTokens);
        collateralToken = IERC20(_collateralToken);
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Create a new liquidity pool
     * @param conditionId The condition ID
     * @param yesAmount Initial YES token amount
     * @param noAmount Initial NO token amount
     */
    function createPool(
        bytes32 conditionId,
        uint256 yesAmount,
        uint256 noAmount
    ) external nonReentrant returns (uint256 liquidity) {
        require(!pools[conditionId].initialized, "Pool already exists");
        require(yesAmount > 0 && noAmount > 0, "Invalid amounts");

        (uint256 yesTokenId, uint256 noTokenId) = conditionalTokens.getPositionIds(conditionId);

        // Transfer tokens from creator
        IERC1155(address(conditionalTokens)).safeTransferFrom(
            msg.sender,
            address(this),
            yesTokenId,
            yesAmount,
            ""
        );
        IERC1155(address(conditionalTokens)).safeTransferFrom(
            msg.sender,
            address(this),
            noTokenId,
            noAmount,
            ""
        );

        // Calculate initial liquidity
        liquidity = _sqrt(yesAmount * noAmount);
        require(liquidity > MIN_LIQUIDITY, "Insufficient liquidity");

        // Initialize pool
        pools[conditionId] = Pool({
            conditionId: conditionId,
            yesReserve: yesAmount,
            noReserve: noAmount,
            totalLiquidity: liquidity,
            initialized: true
        });

        liquidityBalance[conditionId][msg.sender] = liquidity;

        emit PoolCreated(conditionId, yesAmount, noAmount);
        emit LiquidityAdded(conditionId, msg.sender, yesAmount, noAmount, liquidity);

        return liquidity;
    }

    /**
     * @notice Add liquidity to an existing pool
     * @param conditionId The condition ID
     * @param yesAmount YES tokens to add
     * @param noAmount NO tokens to add
     */
    function addLiquidity(
        bytes32 conditionId,
        uint256 yesAmount,
        uint256 noAmount
    ) external nonReentrant returns (uint256 liquidity) {
        Pool storage pool = pools[conditionId];
        require(pool.initialized, "Pool not initialized");

        (uint256 yesTokenId, uint256 noTokenId) = conditionalTokens.getPositionIds(conditionId);

        // Calculate optimal amounts
        uint256 yesOptimal = (noAmount * pool.yesReserve) / pool.noReserve;
        uint256 noOptimal = (yesAmount * pool.noReserve) / pool.yesReserve;

        uint256 finalYesAmount;
        uint256 finalNoAmount;

        if (yesOptimal <= yesAmount) {
            finalYesAmount = yesOptimal;
            finalNoAmount = noAmount;
        } else {
            finalYesAmount = yesAmount;
            finalNoAmount = noOptimal;
        }

        require(finalYesAmount > 0 && finalNoAmount > 0, "Invalid amounts");

        // Transfer tokens
        IERC1155(address(conditionalTokens)).safeTransferFrom(
            msg.sender,
            address(this),
            yesTokenId,
            finalYesAmount,
            ""
        );
        IERC1155(address(conditionalTokens)).safeTransferFrom(
            msg.sender,
            address(this),
            noTokenId,
            finalNoAmount,
            ""
        );

        // Calculate liquidity tokens
        liquidity = (finalYesAmount * pool.totalLiquidity) / pool.yesReserve;

        // Update pool
        pool.yesReserve += finalYesAmount;
        pool.noReserve += finalNoAmount;
        pool.totalLiquidity += liquidity;

        liquidityBalance[conditionId][msg.sender] += liquidity;

        emit LiquidityAdded(conditionId, msg.sender, finalYesAmount, finalNoAmount, liquidity);

        return liquidity;
    }

    /**
     * @notice Remove liquidity from a pool
     * @param conditionId The condition ID
     * @param liquidity Amount of liquidity tokens to burn
     */
    function removeLiquidity(
        bytes32 conditionId,
        uint256 liquidity
    ) external nonReentrant returns (uint256 yesAmount, uint256 noAmount) {
        Pool storage pool = pools[conditionId];
        require(pool.initialized, "Pool not initialized");
        require(liquidityBalance[conditionId][msg.sender] >= liquidity, "Insufficient liquidity");

        (uint256 yesTokenId, uint256 noTokenId) = conditionalTokens.getPositionIds(conditionId);

        // Calculate amounts to return
        yesAmount = (liquidity * pool.yesReserve) / pool.totalLiquidity;
        noAmount = (liquidity * pool.noReserve) / pool.totalLiquidity;

        require(yesAmount > 0 && noAmount > 0, "Insufficient liquidity burned");

        // Update pool
        pool.yesReserve -= yesAmount;
        pool.noReserve -= noAmount;
        pool.totalLiquidity -= liquidity;

        liquidityBalance[conditionId][msg.sender] -= liquidity;

        // Transfer tokens back
        IERC1155(address(conditionalTokens)).safeTransferFrom(
            address(this),
            msg.sender,
            yesTokenId,
            yesAmount,
            ""
        );
        IERC1155(address(conditionalTokens)).safeTransferFrom(
            address(this),
            msg.sender,
            noTokenId,
            noAmount,
            ""
        );

        emit LiquidityRemoved(conditionId, msg.sender, yesAmount, noAmount, liquidity);

        return (yesAmount, noAmount);
    }

    /**
     * @notice Swap collateral for outcome tokens
     * @param conditionId The condition ID
     * @param buyYes True to buy YES, false to buy NO
     * @param amountIn Amount of collateral to spend
     * @param minAmountOut Minimum tokens to receive (slippage protection)
     */
    function swap(
        bytes32 conditionId,
        bool buyYes,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        Pool storage pool = pools[conditionId];
        require(pool.initialized, "Pool not initialized");
        require(amountIn > 0, "Invalid amount");

        // Transfer collateral
        collateralToken.safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve and split into YES + NO tokens
        collateralToken.approve(address(conditionalTokens), amountIn);
        conditionalTokens.splitPosition(conditionId, amountIn);

        (uint256 yesTokenId, uint256 noTokenId) = conditionalTokens.getPositionIds(conditionId);

        uint256 sellTokenId = buyYes ? noTokenId : yesTokenId;
        uint256 buyTokenId = buyYes ? yesTokenId : noTokenId;

        // Calculate swap with fee
        uint256 fee = (amountIn * swapFee) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;

        // Calculate amount out using constant product
        uint256 reserveIn = buyYes ? pool.noReserve : pool.yesReserve;
        uint256 reserveOut = buyYes ? pool.yesReserve : pool.noReserve;

        amountOut = (amountInAfterFee * reserveOut) / (reserveIn + amountInAfterFee);
        require(amountOut >= minAmountOut, "Slippage exceeded");
        require(amountOut < reserveOut, "Insufficient liquidity");

        // Update reserves
        if (buyYes) {
            pool.noReserve += amountIn;
            pool.yesReserve -= amountOut;
        } else {
            pool.yesReserve += amountIn;
            pool.noReserve -= amountOut;
        }

        // Transfer outcome tokens to trader
        IERC1155(address(conditionalTokens)).safeTransferFrom(
            address(this),
            msg.sender,
            buyTokenId,
            amountOut,
            ""
        );

        // Send fee tokens to fee recipient
        if (fee > 0) {
            IERC1155(address(conditionalTokens)).safeTransferFrom(
                address(this),
                feeRecipient,
                sellTokenId,
                fee,
                ""
            );
        }

        emit Swap(conditionId, msg.sender, buyYes, amountIn, amountOut, fee);

        return amountOut;
    }

    /**
     * @notice Get quote for a swap
     * @param conditionId The condition ID
     * @param buyYes True for YES, false for NO
     * @param amountIn Input amount
     */
    function getAmountOut(
        bytes32 conditionId,
        bool buyYes,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        Pool memory pool = pools[conditionId];
        require(pool.initialized, "Pool not initialized");

        uint256 fee = (amountIn * swapFee) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;

        uint256 reserveIn = buyYes ? pool.noReserve : pool.yesReserve;
        uint256 reserveOut = buyYes ? pool.yesReserve : pool.noReserve;

        amountOut = (amountInAfterFee * reserveOut) / (reserveIn + amountInAfterFee);

        return amountOut;
    }

    /**
     * @notice Get current price (YES probability)
     * @param conditionId The condition ID
     */
    function getCurrentPrice(bytes32 conditionId) external view returns (uint256) {
        Pool memory pool = pools[conditionId];
        require(pool.initialized, "Pool not initialized");

        // Price = noReserve / (yesReserve + noReserve)
        // Multiply by 1e18 for precision
        return (pool.noReserve * 1e18) / (pool.yesReserve + pool.noReserve);
    }

    /**
     * @notice Update swap fee
     */
    function setSwapFee(uint256 _swapFee) external onlyOwner {
        require(_swapFee <= 500, "Fee too high"); // Max 5%
        swapFee = _swapFee;
        emit FeeUpdated(_swapFee);
    }

    /**
     * @notice Update fee recipient
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Square root calculation (Babylonian method)
     */
    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /**
     * @notice Required for receiving ERC1155 tokens
     */
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
