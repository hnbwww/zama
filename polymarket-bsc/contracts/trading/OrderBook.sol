// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../core/ConditionalTokens.sol";

/**
 * @title OrderBook
 * @notice Off-chain order book with on-chain settlement using signatures
 * @dev Supports limit orders for YES/NO outcome tokens
 */
contract OrderBook is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // References
    ConditionalTokens public immutable conditionalTokens;
    IERC20 public immutable collateralToken;

    // Fee configuration
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public makerFee = 10; // 0.1%
    uint256 public takerFee = 20; // 0.2%
    address public feeRecipient;

    // Order structure
    struct Order {
        bytes32 conditionId;
        address maker;
        bool buyYes; // true = buy YES, false = buy NO
        uint256 price; // Price in 1e18 (0.65 = 0.65e18)
        uint256 size; // Amount of tokens
        uint256 filled; // Amount already filled
        uint256 nonce; // Unique nonce
        uint256 expiry; // Expiration timestamp (0 = never)
        bytes signature; // Maker's signature
    }

    enum OrderStatus {
        Invalid,
        Fillable,
        Filled,
        Cancelled,
        Expired
    }

    // Storage
    mapping(bytes32 => uint256) public orderFilled; // orderHash => filled amount
    mapping(bytes32 => bool) public orderCancelled;
    mapping(address => uint256) public userNonce;

    // Events
    event OrderPlaced(
        bytes32 indexed orderHash,
        bytes32 indexed conditionId,
        address indexed maker,
        bool buyYes,
        uint256 price,
        uint256 size,
        uint256 nonce,
        uint256 expiry
    );

    event OrderFilled(
        bytes32 indexed orderHash,
        address indexed taker,
        uint256 fillAmount,
        uint256 makerFeeAmount,
        uint256 takerFeeAmount
    );

    event OrderCancelled(
        bytes32 indexed orderHash,
        address indexed maker
    );

    event FeesUpdated(uint256 makerFee, uint256 takerFee);

    constructor(
        address _conditionalTokens,
        address _collateralToken,
        address _feeRecipient
    ) {
        require(_conditionalTokens != address(0), "Invalid CTF");
        require(_collateralToken != address(0), "Invalid collateral");
        require(_feeRecipient != address(0), "Invalid fee recipient");

        conditionalTokens = ConditionalTokens(_conditionalTokens);
        collateralToken = IERC20(_collateralToken);
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Get order hash for signing
     */
    function getOrderHash(Order memory order) public pure returns (bytes32) {
        return keccak256(abi.encode(
            order.conditionId,
            order.maker,
            order.buyYes,
            order.price,
            order.size,
            order.nonce,
            order.expiry
        ));
    }

    /**
     * @notice Validate order signature
     */
    function validateOrderSignature(Order memory order) public pure returns (bool) {
        bytes32 orderHash = getOrderHash(order);
        bytes32 ethSignedHash = orderHash.toEthSignedMessageHash();
        address recovered = ethSignedHash.recover(order.signature);
        return recovered == order.maker;
    }

    /**
     * @notice Get order status
     */
    function getOrderStatus(Order memory order) public view returns (OrderStatus) {
        bytes32 orderHash = getOrderHash(order);

        // Check if cancelled
        if (orderCancelled[orderHash]) {
            return OrderStatus.Cancelled;
        }

        // Check if expired
        if (order.expiry > 0 && block.timestamp > order.expiry) {
            return OrderStatus.Expired;
        }

        // Check signature
        if (!validateOrderSignature(order)) {
            return OrderStatus.Invalid;
        }

        // Check if filled
        uint256 filled = orderFilled[orderHash];
        if (filled >= order.size) {
            return OrderStatus.Filled;
        }

        return OrderStatus.Fillable;
    }

    /**
     * @notice Fill an order (market maker/taker flow)
     * @param order The order to fill
     * @param fillAmount Amount to fill
     */
    function fillOrder(
        Order memory order,
        uint256 fillAmount
    ) external nonReentrant {
        require(fillAmount > 0, "Invalid fill amount");

        bytes32 orderHash = getOrderHash(order);
        OrderStatus status = getOrderStatus(order);
        require(status == OrderStatus.Fillable, "Order not fillable");

        uint256 remainingSize = order.size - orderFilled[orderHash];
        require(fillAmount <= remainingSize, "Fill exceeds remaining");

        // Update filled amount
        orderFilled[orderHash] += fillAmount;

        // Calculate fees
        uint256 makerFeeAmount = (fillAmount * makerFee) / FEE_DENOMINATOR;
        uint256 takerFeeAmount = (fillAmount * takerFee) / FEE_DENOMINATOR;

        (uint256 yesTokenId, uint256 noTokenId) = conditionalTokens.getPositionIds(order.conditionId);

        if (order.buyYes) {
            // Maker wants to buy YES, taker sells YES
            _executeTrade(
                order.maker,
                msg.sender,
                yesTokenId,
                noTokenId,
                fillAmount,
                order.price,
                makerFeeAmount,
                takerFeeAmount,
                true
            );
        } else {
            // Maker wants to buy NO, taker sells NO
            _executeTrade(
                order.maker,
                msg.sender,
                noTokenId,
                yesTokenId,
                fillAmount,
                order.price,
                makerFeeAmount,
                takerFeeAmount,
                false
            );
        }

        emit OrderFilled(orderHash, msg.sender, fillAmount, makerFeeAmount, takerFeeAmount);
    }

    /**
     * @notice Execute trade between maker and taker
     */
    function _executeTrade(
        address maker,
        address taker,
        uint256 buyTokenId,
        uint256 sellTokenId,
        uint256 amount,
        uint256 price,
        uint256 makerFeeAmount,
        uint256 takerFeeAmount,
        bool makerBuysYes
    ) private {
        // Calculate collateral amounts
        uint256 makerCollateral = (amount * price) / 1e18;
        uint256 takerCollateral = amount - makerCollateral;

        // Maker provides collateral for their side
        collateralToken.safeTransferFrom(maker, address(this), makerCollateral + makerFeeAmount);

        // Taker provides collateral for their side
        collateralToken.safeTransferFrom(taker, address(this), takerCollateral + takerFeeAmount);

        // Total collateral to split
        uint256 totalCollateral = makerCollateral + takerCollateral;

        // Approve and split into YES + NO
        collateralToken.approve(address(conditionalTokens), totalCollateral);
        conditionalTokens.splitPosition(bytes32(buyTokenId), totalCollateral); // Using buyTokenId as conditionId temporarily

        // Transfer tokens to maker and taker
        IERC1155(address(conditionalTokens)).safeTransferFrom(
            address(this),
            maker,
            buyTokenId,
            amount,
            ""
        );

        IERC1155(address(conditionalTokens)).safeTransferFrom(
            address(this),
            taker,
            sellTokenId,
            amount,
            ""
        );

        // Transfer fees
        if (makerFeeAmount + takerFeeAmount > 0) {
            collateralToken.safeTransfer(feeRecipient, makerFeeAmount + takerFeeAmount);
        }
    }

    /**
     * @notice Cancel an order
     * @param order The order to cancel
     */
    function cancelOrder(Order memory order) external {
        require(msg.sender == order.maker, "Only maker can cancel");

        bytes32 orderHash = getOrderHash(order);
        require(!orderCancelled[orderHash], "Already cancelled");
        require(getOrderStatus(order) == OrderStatus.Fillable, "Order not fillable");

        orderCancelled[orderHash] = true;

        emit OrderCancelled(orderHash, msg.sender);
    }

    /**
     * @notice Batch cancel orders by incrementing nonce
     */
    function incrementNonce() external {
        userNonce[msg.sender]++;
    }

    /**
     * @notice Get remaining fillable amount
     */
    function getRemainingFillable(Order memory order) external view returns (uint256) {
        if (getOrderStatus(order) != OrderStatus.Fillable) {
            return 0;
        }

        bytes32 orderHash = getOrderHash(order);
        return order.size - orderFilled[orderHash];
    }

    /**
     * @notice Update fees (governance function)
     */
    function updateFees(uint256 _makerFee, uint256 _takerFee) external {
        require(_makerFee <= 100 && _takerFee <= 100, "Fee too high"); // Max 1%
        makerFee = _makerFee;
        takerFee = _takerFee;
        emit FeesUpdated(_makerFee, _takerFee);
    }

    /**
     * @notice Update fee recipient
     */
    function setFeeRecipient(address _feeRecipient) external {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
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
