// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OptimisticOracle
 * @notice Optimistic Oracle for resolving prediction markets
 * @dev Implements Propose → Dispute → Settle workflow similar to UMA Protocol
 */
contract OptimisticOracle is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Collateral token for bonds
    IERC20 public immutable bondToken;

    // Oracle configuration
    uint256 public proposeBond;           // Bond required to propose a resolution
    uint256 public disputeBond;           // Bond required to dispute a proposal
    uint256 public challengeWindow;       // Time window for disputes (in seconds)
    address public feePool;               // Address to receive forfeited bonds

    // Proposer whitelist
    bool public whitelistEnabled;
    mapping(address => bool) public isProposer;

    // Request structure
    struct Request {
        bytes32 conditionId;
        address requester;
        uint256 timestamp;
        string question;
        string resolutionSource;
        RequestStatus status;
        uint256 proposedOutcome;   // 0 = NO, 1 = YES, 2 = INVALID
        address proposer;
        uint256 proposeTimestamp;
        uint256 challengeDeadline;
        address disputer;
        uint256 disputeTimestamp;
        uint256 finalOutcome;      // Final resolved outcome
    }

    enum RequestStatus {
        Requested,      // Request created, awaiting proposal
        Proposed,       // Outcome proposed, in challenge window
        Disputed,       // Proposal disputed, awaiting arbitration
        Resolved,       // Final resolution confirmed
        Voided          // Market voided/cancelled
    }

    // Storage
    mapping(bytes32 => Request) public requests;
    mapping(bytes32 => uint256) public proposerBonds;  // conditionId => bond amount
    mapping(bytes32 => uint256) public disputerBonds;  // conditionId => bond amount

    // Events
    event RequestCreated(
        bytes32 indexed conditionId,
        address indexed requester,
        string question,
        uint256 timestamp
    );

    event OutcomeProposed(
        bytes32 indexed conditionId,
        address indexed proposer,
        uint256 outcome,
        uint256 bond,
        uint256 challengeDeadline
    );

    event OutcomeDisputed(
        bytes32 indexed conditionId,
        address indexed disputer,
        uint256 bond,
        string reason
    );

    event RequestResolved(
        bytes32 indexed conditionId,
        uint256 outcome,
        address proposer,
        address disputer,
        uint256 timestamp
    );

    event RequestVoided(
        bytes32 indexed conditionId,
        string reason,
        uint256 timestamp
    );

    event ProposerWhitelisted(address indexed proposer, bool status);
    event BondConfigUpdated(uint256 proposeBond, uint256 disputeBond);
    event ChallengeWindowUpdated(uint256 newWindow);

    constructor(
        address _bondToken,
        uint256 _proposeBond,
        uint256 _disputeBond,
        uint256 _challengeWindow,
        address _feePool
    ) Ownable(msg.sender) {
        require(_bondToken != address(0), "Invalid bond token");
        require(_feePool != address(0), "Invalid fee pool");
        require(_challengeWindow >= 1 hours && _challengeWindow <= 7 days, "Invalid challenge window");

        bondToken = IERC20(_bondToken);
        proposeBond = _proposeBond;
        disputeBond = _disputeBond;
        challengeWindow = _challengeWindow;
        feePool = _feePool;
        whitelistEnabled = false;
    }

    /**
     * @notice Create a resolution request
     * @param conditionId Unique identifier for the market
     * @param question Market question
     * @param resolutionSource Source for resolution data
     */
    function requestResolution(
        bytes32 conditionId,
        string calldata question,
        string calldata resolutionSource
    ) external returns (bytes32) {
        require(requests[conditionId].timestamp == 0, "Request already exists");

        requests[conditionId] = Request({
            conditionId: conditionId,
            requester: msg.sender,
            timestamp: block.timestamp,
            question: question,
            resolutionSource: resolutionSource,
            status: RequestStatus.Requested,
            proposedOutcome: 2, // Initialize as INVALID
            proposer: address(0),
            proposeTimestamp: 0,
            challengeDeadline: 0,
            disputer: address(0),
            disputeTimestamp: 0,
            finalOutcome: 2
        });

        emit RequestCreated(conditionId, msg.sender, question, block.timestamp);

        return conditionId;
    }

    /**
     * @notice Propose an outcome for a request
     * @param conditionId The request ID
     * @param outcome Proposed outcome (0 = NO, 1 = YES, 2 = INVALID)
     */
    function proposeOutcome(bytes32 conditionId, uint256 outcome) external nonReentrant {
        Request storage request = requests[conditionId];
        require(request.status == RequestStatus.Requested, "Invalid request status");
        require(outcome <= 2, "Invalid outcome");

        // Check whitelist if enabled
        if (whitelistEnabled) {
            require(isProposer[msg.sender], "Not whitelisted proposer");
        }

        // Collect propose bond
        bondToken.safeTransferFrom(msg.sender, address(this), proposeBond);
        proposerBonds[conditionId] = proposeBond;

        // Update request
        request.status = RequestStatus.Proposed;
        request.proposedOutcome = outcome;
        request.proposer = msg.sender;
        request.proposeTimestamp = block.timestamp;
        request.challengeDeadline = block.timestamp + challengeWindow;

        emit OutcomeProposed(
            conditionId,
            msg.sender,
            outcome,
            proposeBond,
            request.challengeDeadline
        );
    }

    /**
     * @notice Dispute a proposed outcome
     * @param conditionId The request ID
     * @param reason Reason for dispute
     */
    function disputeOutcome(bytes32 conditionId, string calldata reason) external nonReentrant {
        Request storage request = requests[conditionId];
        require(request.status == RequestStatus.Proposed, "Invalid request status");
        require(block.timestamp <= request.challengeDeadline, "Challenge period ended");

        // Collect dispute bond
        bondToken.safeTransferFrom(msg.sender, address(this), disputeBond);
        disputerBonds[conditionId] = disputeBond;

        // Update request
        request.status = RequestStatus.Disputed;
        request.disputer = msg.sender;
        request.disputeTimestamp = block.timestamp;

        emit OutcomeDisputed(conditionId, msg.sender, disputeBond, reason);
    }

    /**
     * @notice Finalize a resolution (after challenge window or arbitration)
     * @param conditionId The request ID
     */
    function finalizeResolution(bytes32 conditionId) external {
        Request storage request = requests[conditionId];

        if (request.status == RequestStatus.Proposed) {
            // No dispute, challenge window passed
            require(block.timestamp > request.challengeDeadline, "Challenge period not ended");

            request.status = RequestStatus.Resolved;
            request.finalOutcome = request.proposedOutcome;

            // Return bond to proposer
            bondToken.safeTransfer(request.proposer, proposerBonds[conditionId]);
            delete proposerBonds[conditionId];

            emit RequestResolved(
                conditionId,
                request.finalOutcome,
                request.proposer,
                address(0),
                block.timestamp
            );

        } else if (request.status == RequestStatus.Disputed) {
            // Arbitration completed (only owner/arbitrator can call)
            require(msg.sender == owner(), "Only arbitrator");
            require(request.finalOutcome <= 2, "Final outcome not set");

            request.status = RequestStatus.Resolved;

            // Determine winner and distribute bonds
            bool proposerWon = (request.finalOutcome == request.proposedOutcome);

            if (proposerWon) {
                // Proposer wins: gets bond back + disputer's bond
                uint256 totalReward = proposerBonds[conditionId] + disputerBonds[conditionId];
                bondToken.safeTransfer(request.proposer, totalReward);
            } else {
                // Disputer wins: gets bond back + proposer's bond
                uint256 totalReward = proposerBonds[conditionId] + disputerBonds[conditionId];
                bondToken.safeTransfer(request.disputer, totalReward);
            }

            delete proposerBonds[conditionId];
            delete disputerBonds[conditionId];

            emit RequestResolved(
                conditionId,
                request.finalOutcome,
                request.proposer,
                request.disputer,
                block.timestamp
            );

        } else {
            revert("Invalid status for finalization");
        }
    }

    /**
     * @notice Set final outcome for disputed request (arbitrator only)
     * @param conditionId The request ID
     * @param outcome Final outcome (0 = NO, 1 = YES, 2 = INVALID)
     */
    function setDisputedOutcome(bytes32 conditionId, uint256 outcome) external onlyOwner {
        Request storage request = requests[conditionId];
        require(request.status == RequestStatus.Disputed, "Not disputed");
        require(outcome <= 2, "Invalid outcome");

        request.finalOutcome = outcome;
    }

    /**
     * @notice Void a market (emergency function)
     * @param conditionId The request ID
     * @param reason Reason for voiding
     */
    function voidMarket(bytes32 conditionId, string calldata reason) external onlyOwner {
        Request storage request = requests[conditionId];
        require(request.status != RequestStatus.Resolved, "Already resolved");
        require(request.status != RequestStatus.Voided, "Already voided");

        request.status = RequestStatus.Voided;
        request.finalOutcome = 2; // INVALID

        // Return bonds to proposer and disputer
        if (proposerBonds[conditionId] > 0) {
            bondToken.safeTransfer(request.proposer, proposerBonds[conditionId]);
            delete proposerBonds[conditionId];
        }

        if (disputerBonds[conditionId] > 0) {
            bondToken.safeTransfer(request.disputer, disputerBonds[conditionId]);
            delete disputerBonds[conditionId];
        }

        emit RequestVoided(conditionId, reason, block.timestamp);
    }

    // ========== Admin Functions ==========

    /**
     * @notice Update whitelist status for a proposer
     */
    function setProposer(address proposer, bool status) external onlyOwner {
        require(proposer != address(0), "Invalid address");
        isProposer[proposer] = status;
        emit ProposerWhitelisted(proposer, status);
    }

    /**
     * @notice Enable/disable proposer whitelist
     */
    function setWhitelistEnabled(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
    }

    /**
     * @notice Update bond amounts
     */
    function updateBonds(uint256 _proposeBond, uint256 _disputeBond) external onlyOwner {
        require(_proposeBond > 0 && _disputeBond > 0, "Invalid bond amounts");
        proposeBond = _proposeBond;
        disputeBond = _disputeBond;
        emit BondConfigUpdated(_proposeBond, _disputeBond);
    }

    /**
     * @notice Update challenge window
     */
    function updateChallengeWindow(uint256 _challengeWindow) external onlyOwner {
        require(_challengeWindow >= 1 hours && _challengeWindow <= 7 days, "Invalid window");
        challengeWindow = _challengeWindow;
        emit ChallengeWindowUpdated(_challengeWindow);
    }

    /**
     * @notice Update fee pool address
     */
    function setFeePool(address _feePool) external onlyOwner {
        require(_feePool != address(0), "Invalid address");
        feePool = _feePool;
    }

    // ========== View Functions ==========

    /**
     * @notice Get request details
     */
    function getRequest(bytes32 conditionId) external view returns (Request memory) {
        return requests[conditionId];
    }

    /**
     * @notice Check if request is resolved
     */
    function isResolved(bytes32 conditionId) external view returns (bool) {
        return requests[conditionId].status == RequestStatus.Resolved;
    }

    /**
     * @notice Get final outcome
     */
    function getOutcome(bytes32 conditionId) external view returns (uint256) {
        require(requests[conditionId].status == RequestStatus.Resolved, "Not resolved");
        return requests[conditionId].finalOutcome;
    }

    /**
     * @notice Get time until challenge deadline
     */
    function getTimeUntilDeadline(bytes32 conditionId) external view returns (uint256) {
        Request memory request = requests[conditionId];
        if (request.status != RequestStatus.Proposed) return 0;
        if (block.timestamp >= request.challengeDeadline) return 0;
        return request.challengeDeadline - block.timestamp;
    }
}
