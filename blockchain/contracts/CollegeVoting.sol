// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CollegeVoting {

    // ============================================================
    // OWNER + ADMIN GOVERNANCE
    // ============================================================

    address public owner;

    mapping(address => bool) private electionAdmins;
    address[] private adminList;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only owner"
        );
        _;
    }

    modifier onlyOwnerOrAdmin() {
        require(
            msg.sender == owner ||
            electionAdmins[msg.sender],
            "Only owner"
        );
        _;
    }

    // ============================================================
    // ELECTION STATUS
    // ============================================================

    enum ElectionStatus {
        DRAFT,
        SCHEDULED,
        ACTIVE,
        PAUSED,
        ENDED,
        FINALIZING,
        PUBLISHED,
        CANCELLED,
        COMPROMISED,
        INVALIDATED
    }

    // ============================================================
    // ELECTION TYPE
    // ============================================================

    enum ElectionType {
        CLASS_REP,
        DEPARTMENT,
        STUDENT_COUNCIL,
        FACULTY,
        STUDENT_FACULTY,
        CUSTOM
    }

    // ============================================================
    // CANDIDATE STATUS
    // ============================================================

    enum CandidateStatus {
        ACTIVE,
        REMOVED,
        WITHDRAWN
    }

    // ============================================================
    // SECURITY SEVERITY
    // ============================================================

    enum SecuritySeverity {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    // ============================================================
    // ELECTION STRUCT
    // ============================================================

    struct Election {
        uint256 id;
        string title;
        ElectionType electionType;
        ElectionStatus status;
        uint256 startTime;
        uint256 endTime;
        uint256 eligibleVoterCount;
        uint256 totalVotes;
    }

    // ============================================================
    // CANDIDATE STRUCT
    // ============================================================

    struct Candidate {
        uint256 id;
        bytes32 identityHash;
        bytes32 metadataHash;
        CandidateStatus status;
        uint256 voteCount;
    }

    // ============================================================
    // SECURITY INCIDENT STRUCT
    // ============================================================

    struct SecurityIncident {
        uint256 id;
        uint256 electionId;
        SecuritySeverity severity;
        bytes32 incidentType;
        bytes32 descriptionHash;
        bytes32 evidenceHash;
        address reportedBy;
        uint256 timestamp;
    }

    // ============================================================
    // PHASE 7 - ELECTION RESULT STRUCT
    // ============================================================

    struct ElectionResult {
        uint256 electionId;
        uint256 totalVotes;
        uint256 eligibleVoters;
        uint256 turnoutBasisPoints;
        uint256 winnerCandidateId;
        uint256 winningVoteCount;
        bool isTie;
        bool hasVotes;
        bytes32 resultHash;
        uint256 finalizedAt;
        address finalizedBy;
    }

    // ============================================================
    // ELECTION STORAGE
    // ============================================================

    uint256 private nextElectionId = 1;

    mapping(
        uint256 => Election
    ) private elections;

    // ============================================================
    // CANDIDATE STORAGE
    // ============================================================

    mapping(
        uint256 => uint256
    ) private nextCandidateId;

    mapping(
        uint256 => mapping(
            uint256 => Candidate
        )
    ) private candidates;

    mapping(
        uint256 => uint256[]
    ) private electionCandidateIds;

    mapping(
        uint256 => mapping(
            bytes32 => bool
        )
    ) private candidateIdentityExists;

    // ============================================================
    // VOTER STORAGE
    // ============================================================

    mapping(
        uint256 => mapping(
            bytes32 => bool
        )
    ) private eligibleVoter;

    mapping(
        uint256 => mapping(
            bytes32 => bool
        )
    ) private voterHasVoted;

    mapping(
        uint256 => mapping(
            bytes32 => bool
        )
    ) private voterIdentityExists;

    mapping(
        uint256 => bytes32[]
    ) private electionVoterIdentities;

    // ============================================================
    // SECURITY STORAGE
    // ============================================================

    uint256 private nextSecurityIncidentId = 1;

    mapping(
        uint256 => SecurityIncident
    ) private securityIncidents;

    mapping(
        uint256 => uint256[]
    ) private electionSecurityIncidentIds;

    // ============================================================
    // PHASE 7 - RESULT STORAGE
    // ============================================================

    mapping(
        uint256 => ElectionResult
    ) private electionResults;

    mapping(
        uint256 => bool
    ) private resultFinalized;

    // ============================================================
    // ELECTION EVENTS
    // ============================================================

    event ElectionCreated(
        uint256 indexed electionId,
        string title,
        ElectionType electionType,
        uint256 startTime,
        uint256 endTime
    );

    event ElectionScheduled(
        uint256 indexed electionId
    );

    event ElectionStarted(
        uint256 indexed electionId
    );

    event ElectionPaused(
        uint256 indexed electionId
    );

    event ElectionResumed(
        uint256 indexed electionId
    );

    event ElectionEnded(
        uint256 indexed electionId
    );

    event ElectionFinalizing(
        uint256 indexed electionId
    );

    event ElectionPublished(
        uint256 indexed electionId
    );

    event ElectionCancelled(
        uint256 indexed electionId
    );

    event ElectionCompromised(
        uint256 indexed electionId
    );

    event ElectionInvalidated(
        uint256 indexed electionId
    );

    // ============================================================
    // ADMIN EVENTS
    // ============================================================

    event AdminAdded(
        address indexed admin
    );

    event AdminRemoved(
        address indexed admin
    );

    // ============================================================
    // SECURITY EVENTS
    // ============================================================

    event SecurityIncidentReported(
        uint256 indexed incidentId,
        uint256 indexed electionId,
        SecuritySeverity severity,
        bytes32 incidentType,
        bytes32 descriptionHash,
        bytes32 evidenceHash,
        address indexed reportedBy
    );

    // ============================================================
    // CANDIDATE EVENTS
    // ============================================================

    event CandidateAdded(
        uint256 indexed electionId,
        uint256 indexed candidateId,
        bytes32 identityHash,
        bytes32 metadataHash
    );

    event CandidateUpdated(
        uint256 indexed electionId,
        uint256 indexed candidateId,
        bytes32 metadataHash
    );

    event CandidateRemoved(
        uint256 indexed electionId,
        uint256 indexed candidateId
    );

    event CandidateWithdrawn(
        uint256 indexed electionId,
        uint256 indexed candidateId
    );

    // ============================================================
    // VOTER EVENTS
    // ============================================================

    event VoterRegistered(
        uint256 indexed electionId,
        bytes32 indexed identityHash
    );

    event VoterEligibilityRevoked(
        uint256 indexed electionId,
        bytes32 indexed identityHash
    );

    // ============================================================
    // VOTING EVENT
    // ============================================================

    event VoteCast(
        uint256 indexed electionId,
        bytes32 indexed voterIdentityHash,
        uint256 indexed candidateId
    );

    // ============================================================
    // PHASE 7 - RESULT EVENT
    // ============================================================

    event ElectionResultFinalized(
        uint256 indexed electionId,
        uint256 totalVotes,
        uint256 eligibleVoters,
        uint256 turnoutBasisPoints,
        uint256 winnerCandidateId,
        uint256 winningVoteCount,
        bool isTie,
        bool hasVotes,
        bytes32 resultHash,
        address indexed finalizedBy
    );

    // ============================================================
    // ADMIN MANAGEMENT
    // ============================================================

    function addAdmin(
        address admin
    )
        external
        onlyOwner
    {
        require(
            admin != address(0),
            "Invalid admin address"
        );

        require(
            admin != owner,
            "Owner is already admin"
        );

        require(
            !electionAdmins[admin],
            "Admin already exists"
        );

        electionAdmins[admin] = true;
        adminList.push(admin);

        emit AdminAdded(admin);
    }

    function removeAdmin(
        address admin
    )
        external
        onlyOwner
    {
        require(
            electionAdmins[admin],
            "Admin does not exist"
        );

        electionAdmins[admin] = false;

        for (
            uint256 i = 0;
            i < adminList.length;
            i++
        ) {
            if (adminList[i] == admin) {

                adminList[i] =
                    adminList[
                        adminList.length - 1
                    ];

                adminList.pop();

                break;
            }
        }

        emit AdminRemoved(admin);
    }

    function isAdmin(
        address account
    )
        external
        view
        returns (bool)
    {
        return (
            account == owner ||
            electionAdmins[account]
        );
    }

    function getAdminCount()
        external
        view
        returns (uint256)
    {
        return adminList.length;
    }

    function getAdminAt(
        uint256 index
    )
        external
        view
        returns (address)
    {
        require(
            index < adminList.length,
            "Admin index out of bounds"
        );

        return adminList[index];
    }

    // ============================================================
    // CREATE ELECTION
    // ============================================================

    function createElection(
        string calldata title,
        ElectionType electionType,
        uint256 startTime,
        uint256 endTime,
        uint256 eligibleVoterCount
    )
        external
        onlyOwnerOrAdmin
        returns (uint256)
    {
        require(
            bytes(title).length > 0,
            "Title required"
        );

        require(
            endTime > startTime,
            "Invalid election time"
        );

        require(
            startTime > block.timestamp,
            "Start time must be future"
        );

        uint256 electionId =
            nextElectionId;

        elections[electionId] =
            Election({
                id: electionId,
                title: title,
                electionType: electionType,
                status: ElectionStatus.DRAFT,
                startTime: startTime,
                endTime: endTime,
                eligibleVoterCount: eligibleVoterCount,
                totalVotes: 0
            });

        nextElectionId++;

        nextCandidateId[electionId] = 1;

        emit ElectionCreated(
            electionId,
            title,
            electionType,
            startTime,
            endTime
        );

        return electionId;
    }

    // ============================================================
    // SCHEDULE ELECTION
    // ============================================================

    function scheduleElection(
        uint256 electionId
    )
        external
        onlyOwnerOrAdmin
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.DRAFT,
            "Election not in draft"
        );

        election.status =
            ElectionStatus.SCHEDULED;

        emit ElectionScheduled(
            electionId
        );
    }

    // ============================================================
    // START ELECTION
    // ============================================================

    function startElection(
        uint256 electionId
    )
        external
        onlyOwnerOrAdmin
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.SCHEDULED,
            "Election not scheduled"
        );

        require(
            block.timestamp >=
                election.startTime,
            "Election has not started"
        );

        require(
            block.timestamp <
                election.endTime,
            "Election already ended"
        );

        election.status =
            ElectionStatus.ACTIVE;

        emit ElectionStarted(
            electionId
        );
    }

    // ============================================================
    // PAUSE ELECTION
    // ============================================================

    function pauseElection(
        uint256 electionId
    )
        external
        onlyOwnerOrAdmin
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.ACTIVE,
            "Election not active"
        );

        election.status =
            ElectionStatus.PAUSED;

        emit ElectionPaused(
            electionId
        );
    }

    // ============================================================
    // RESUME ELECTION
    // ============================================================

    function resumeElection(
        uint256 electionId
    )
        external
        onlyOwnerOrAdmin
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.PAUSED,
            "Election not paused"
        );

        require(
            block.timestamp <
                election.endTime,
            "Election already ended"
        );

        election.status =
            ElectionStatus.ACTIVE;

        emit ElectionResumed(
            electionId
        );
    }

    // ============================================================
    // END ELECTION
    // ============================================================

    function endElection(
        uint256 electionId
    )
        external
        onlyOwnerOrAdmin
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.ACTIVE ||
            election.status ==
                ElectionStatus.PAUSED,
            "Election not active"
        );

        require(
            block.timestamp >=
                election.endTime,
            "Election still running"
        );

        election.status =
            ElectionStatus.ENDED;

        emit ElectionEnded(
            electionId
        );
    }

    // ============================================================
    // PHASE 7 - INTERNAL RESULT HASH
    // ============================================================

    function _calculateResultHash(
        uint256 electionId,
        uint256 totalVotes,
        uint256 eligibleVoters,
        uint256 turnoutBasisPoints,
        uint256 winnerCandidateId,
        uint256 winningVoteCount,
        bool isTie,
        bool hasVotes
    )
        internal
        view
        returns (bytes32)
    {
        uint256 candidateCount =
            electionCandidateIds[
                electionId
            ].length;

        uint256[] memory candidateIds =
            new uint256[](candidateCount);

        uint256[] memory candidateVotes =
            new uint256[](candidateCount);

        for (
            uint256 i = 0;
            i < candidateCount;
            i++
        ) {
            uint256 candidateId =
                electionCandidateIds[
                    electionId
                ][i];

            candidateIds[i] = candidateId;

            candidateVotes[i] =
                candidates[
                    electionId
                ][candidateId].voteCount;
        }

        return keccak256(
            abi.encode(
                electionId,
                totalVotes,
                eligibleVoters,
                turnoutBasisPoints,
                winnerCandidateId,
                winningVoteCount,
                isTie,
                hasVotes,
                candidateIds,
                candidateVotes
            )
        );
    }

    // ============================================================
    // FINALIZE ELECTION + CALCULATE RESULT
    // ============================================================

    function finalizeElection(
        uint256 electionId
    )
        external
        onlyOwnerOrAdmin
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.ENDED,
            "Election not ended"
        );

        uint256 totalVotes =
            election.totalVotes;

        uint256 eligibleVoters =
            election.eligibleVoterCount;

        // --------------------------------------------------------
        // Check votes cannot exceed eligible voters
        // --------------------------------------------------------

        require(
            totalVotes <= eligibleVoters,
            "Vote count exceeds eligible voters"
        );

        // --------------------------------------------------------
        // Reconstruct candidate totals
        // --------------------------------------------------------

        uint256 candidateVoteSum = 0;

        uint256 winnerCandidateId = 0;

        uint256 winningVoteCount = 0;

        uint256 candidatesWithMaximumVotes = 0;

        uint256 candidateCount =
            electionCandidateIds[
                electionId
            ].length;

        for (
            uint256 i = 0;
            i < candidateCount;
            i++
        ) {
            uint256 candidateId =
                electionCandidateIds[
                    electionId
                ][i];

            Candidate storage candidate =
                candidates[
                    electionId
                ][candidateId];

            candidateVoteSum +=
                candidate.voteCount;

            if (
                candidate.voteCount >
                winningVoteCount
            ) {
                winningVoteCount =
                    candidate.voteCount;

                winnerCandidateId =
                    candidateId;

                candidatesWithMaximumVotes = 1;
            }
            else if (
                candidate.voteCount ==
                winningVoteCount &&
                candidate.voteCount > 0
            ) {
                candidatesWithMaximumVotes++;
            }
        }

        // --------------------------------------------------------
        // Cross-check candidate totals
        // --------------------------------------------------------

        require(
            candidateVoteSum ==
            totalVotes,
            "Vote count mismatch"
        );

        // --------------------------------------------------------
        // Determine result state
        // --------------------------------------------------------

        bool hasVotes =
            totalVotes > 0;

        bool isTie = false;

        if (
            hasVotes &&
            candidatesWithMaximumVotes > 1
        ) {
            isTie = true;
            winnerCandidateId = 0;
        }

        if (!hasVotes) {
            winnerCandidateId = 0;
            winningVoteCount = 0;
            isTie = false;
        }

        // --------------------------------------------------------
        // Calculate turnout
        //
        // 10000 = 100%
        // 7500  = 75%
        // 5000  = 50%
        // --------------------------------------------------------

        uint256 turnoutBasisPoints = 0;

        if (eligibleVoters > 0) {
            turnoutBasisPoints =
                (
                    totalVotes * 10000
                ) /
                eligibleVoters;
        }

        // --------------------------------------------------------
        // Generate deterministic result hash
        // --------------------------------------------------------

        bytes32 resultHash =
            _calculateResultHash(
                electionId,
                totalVotes,
                eligibleVoters,
                turnoutBasisPoints,
                winnerCandidateId,
                winningVoteCount,
                isTie,
                hasVotes
            );

        // --------------------------------------------------------
        // Store result
        // --------------------------------------------------------

        electionResults[electionId] =
            ElectionResult({
                electionId: electionId,
                totalVotes: totalVotes,
                eligibleVoters: eligibleVoters,
                turnoutBasisPoints:
                    turnoutBasisPoints,
                winnerCandidateId:
                    winnerCandidateId,
                winningVoteCount:
                    winningVoteCount,
                isTie: isTie,
                hasVotes: hasVotes,
                resultHash: resultHash,
                finalizedAt: block.timestamp,
                finalizedBy: msg.sender
            });

        resultFinalized[electionId] =
            true;

        // --------------------------------------------------------
        // Move election to FINALIZING
        // --------------------------------------------------------

        election.status =
            ElectionStatus.FINALIZING;

        emit ElectionFinalizing(
            electionId
        );

        emit ElectionResultFinalized(
            electionId,
            totalVotes,
            eligibleVoters,
            turnoutBasisPoints,
            winnerCandidateId,
            winningVoteCount,
            isTie,
            hasVotes,
            resultHash,
            msg.sender
        );
    }

    // ============================================================
    // PUBLISH ELECTION
    // ============================================================

    function publishElection(
        uint256 electionId
    )
        external
        onlyOwnerOrAdmin
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.FINALIZING,
            "Election not finalizing"
        );

        require(
            resultFinalized[electionId],
            "Result not finalized"
        );

        election.status =
            ElectionStatus.PUBLISHED;

        emit ElectionPublished(
            electionId
        );
    }

    // ============================================================
    // CANCEL ELECTION
    // ============================================================

    function cancelElection(
        uint256 electionId
    )
        external
        onlyOwnerOrAdmin
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.ACTIVE,
            "Election not active"
        );

        election.status =
            ElectionStatus.CANCELLED;

        emit ElectionCancelled(
            electionId
        );
    }

    // ============================================================
    // COMPROMISE ELECTION
    // ============================================================

    function compromiseElection(
        uint256 electionId
    )
        external
        onlyOwner
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.ACTIVE,
            "Election not active"
        );

        election.status =
            ElectionStatus.COMPROMISED;

        emit ElectionCompromised(
            electionId
        );
    }

    // ============================================================
    // INVALIDATE ELECTION
    // ============================================================

    function invalidateElection(
        uint256 electionId
    )
        external
        onlyOwner
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.COMPROMISED,
            "Election not compromised"
        );

        election.status =
            ElectionStatus.INVALIDATED;

        emit ElectionInvalidated(
            electionId
        );
    }

    // ============================================================
    // PHASE 6 - REPORT SECURITY INCIDENT
    // ============================================================

    function reportSecurityIncident(
        uint256 electionId,
        SecuritySeverity severity,
        bytes32 incidentType,
        bytes32 descriptionHash,
        bytes32 evidenceHash
    )
        external
        onlyOwnerOrAdmin
        returns (uint256)
    {
        require(
            elections[electionId].id != 0,
            "Election does not exist"
        );

        require(
            incidentType != bytes32(0),
            "Incident type required"
        );

        require(
            descriptionHash != bytes32(0),
            "Description hash required"
        );

        uint256 incidentId =
            nextSecurityIncidentId;

        securityIncidents[incidentId] =
            SecurityIncident({
                id: incidentId,
                electionId: electionId,
                severity: severity,
                incidentType: incidentType,
                descriptionHash: descriptionHash,
                evidenceHash: evidenceHash,
                reportedBy: msg.sender,
                timestamp: block.timestamp
            });

        electionSecurityIncidentIds[
            electionId
        ].push(incidentId);

        nextSecurityIncidentId++;

        emit SecurityIncidentReported(
            incidentId,
            electionId,
            severity,
            incidentType,
            descriptionHash,
            evidenceHash,
            msg.sender
        );

        return incidentId;
    }

    // ============================================================
    // GET SECURITY INCIDENT
    // ============================================================

    function getSecurityIncident(
        uint256 incidentId
    )
        external
        view
        returns (SecurityIncident memory)
    {
        require(
            securityIncidents[incidentId].id != 0,
            "Incident does not exist"
        );

        return securityIncidents[
            incidentId
        ];
    }

    function getSecurityIncidentCount()
        external
        view
        returns (uint256)
    {
        return nextSecurityIncidentId - 1;
    }

    function getElectionSecurityIncidentCount(
        uint256 electionId
    )
        external
        view
        returns (uint256)
    {
        require(
            elections[electionId].id != 0,
            "Election does not exist"
        );

        return electionSecurityIncidentIds[
            electionId
        ].length;
    }

    function getElectionSecurityIncidentId(
        uint256 electionId,
        uint256 index
    )
        external
        view
        returns (uint256)
    {
        require(
            elections[electionId].id != 0,
            "Election does not exist"
        );

        require(
            index <
            electionSecurityIncidentIds[
                electionId
            ].length,
            "Incident index out of bounds"
        );

        return electionSecurityIncidentIds[
            electionId
        ][index];
    }

    // ============================================================
    // ADD CANDIDATE
    // ============================================================

    function addCandidate(
        uint256 electionId,
        bytes32 identityHash,
        bytes32 metadataHash
    )
        external
        onlyOwnerOrAdmin
        returns (uint256)
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.DRAFT ||
            election.status ==
                ElectionStatus.SCHEDULED,
            "Candidate list locked"
        );

        require(
            identityHash != bytes32(0),
            "Identity hash required"
        );

        require(
            !candidateIdentityExists[
                electionId
            ][identityHash],
            "Candidate already exists"
        );

        uint256 candidateId =
            nextCandidateId[electionId];

        candidates[
            electionId
        ][candidateId] =
            Candidate({
                id: candidateId,
                identityHash: identityHash,
                metadataHash: metadataHash,
                status: CandidateStatus.ACTIVE,
                voteCount: 0
            });

        electionCandidateIds[
            electionId
        ].push(candidateId);

        candidateIdentityExists[
            electionId
        ][identityHash] = true;

        nextCandidateId[
            electionId
        ]++;

        emit CandidateAdded(
            electionId,
            candidateId,
            identityHash,
            metadataHash
        );

        return candidateId;
    }

    // ============================================================
    // UPDATE CANDIDATE
    // ============================================================

    function updateCandidate(
        uint256 electionId,
        uint256 candidateId,
        bytes32 metadataHash
    )
        external
        onlyOwnerOrAdmin
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.DRAFT ||
            election.status ==
                ElectionStatus.SCHEDULED,
            "Candidate list locked"
        );

        Candidate storage candidate =
            candidates[
                electionId
            ][candidateId];

        require(
            candidate.id != 0,
            "Candidate does not exist"
        );

        require(
            candidate.status ==
                CandidateStatus.ACTIVE,
            "Candidate not active"
        );

        candidate.metadataHash =
            metadataHash;

        emit CandidateUpdated(
            electionId,
            candidateId,
            metadataHash
        );
    }

    // ============================================================
    // REMOVE CANDIDATE
    // ============================================================

    function removeCandidate(
        uint256 electionId,
        uint256 candidateId
    )
        external
        onlyOwnerOrAdmin
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.DRAFT ||
            election.status ==
                ElectionStatus.SCHEDULED,
            "Candidate list locked"
        );

        Candidate storage candidate =
            candidates[
                electionId
            ][candidateId];

        require(
            candidate.id != 0,
            "Candidate does not exist"
        );

        require(
            candidate.status ==
                CandidateStatus.ACTIVE,
            "Candidate not active"
        );

        candidate.status =
            CandidateStatus.REMOVED;

        emit CandidateRemoved(
            electionId,
            candidateId
        );
    }

    // ============================================================
    // WITHDRAW CANDIDATE
    // ============================================================

    function withdrawCandidate(
        uint256 electionId,
        uint256 candidateId
    )
        external
        onlyOwnerOrAdmin
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.ACTIVE ||
            election.status ==
                ElectionStatus.PAUSED,
            "Election not running"
        );

        Candidate storage candidate =
            candidates[
                electionId
            ][candidateId];

        require(
            candidate.id != 0,
            "Candidate does not exist"
        );

        require(
            candidate.status ==
                CandidateStatus.ACTIVE,
            "Candidate not active"
        );

        candidate.status =
            CandidateStatus.WITHDRAWN;

        emit CandidateWithdrawn(
            electionId,
            candidateId
        );
    }

    // ============================================================
    // REGISTER VOTER
    // ============================================================

    function registerVoter(
        uint256 electionId,
        bytes32 identityHash
    )
        external
        onlyOwnerOrAdmin
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.DRAFT ||
            election.status ==
                ElectionStatus.SCHEDULED,
            "Voter registration locked"
        );

        require(
            identityHash != bytes32(0),
            "Identity hash required"
        );

        require(
            !voterIdentityExists[
                electionId
            ][identityHash],
            "Voter already registered"
        );

        eligibleVoter[
            electionId
        ][identityHash] = true;

        voterIdentityExists[
            electionId
        ][identityHash] = true;

        electionVoterIdentities[
            electionId
        ].push(identityHash);

        election.eligibleVoterCount++;

        emit VoterRegistered(
            electionId,
            identityHash
        );
    }

    // ============================================================
    // REVOKE VOTER ELIGIBILITY
    // ============================================================

    function revokeVoterEligibility(
        uint256 electionId,
        bytes32 identityHash
    )
        external
        onlyOwnerOrAdmin
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.DRAFT ||
            election.status ==
                ElectionStatus.SCHEDULED,
            "Voter registration locked"
        );

        require(
            voterIdentityExists[
                electionId
            ][identityHash],
            "Voter not registered"
        );

        require(
            eligibleVoter[
                electionId
            ][identityHash],
            "Voter already ineligible"
        );

        eligibleVoter[
            electionId
        ][identityHash] = false;

        election.eligibleVoterCount--;

        emit VoterEligibilityRevoked(
            electionId,
            identityHash
        );
    }

    // ============================================================
    // CHECK VOTER ELIGIBILITY
    // ============================================================

    function isEligibleVoter(
        uint256 electionId,
        bytes32 identityHash
    )
        external
        view
        returns (bool)
    {
        require(
            elections[electionId].id != 0,
            "Election does not exist"
        );

        return eligibleVoter[
            electionId
        ][identityHash];
    }

    // ============================================================
    // CHECK WHETHER VOTER HAS VOTED
    // ============================================================

    function hasVoted(
        uint256 electionId,
        bytes32 identityHash
    )
        external
        view
        returns (bool)
    {
        require(
            elections[electionId].id != 0,
            "Election does not exist"
        );

        return voterHasVoted[
            electionId
        ][identityHash];
    }

    // ============================================================
    // GET REGISTERED VOTER COUNT
    // ============================================================

    function getVoterCount(
        uint256 electionId
    )
        external
        view
        returns (uint256)
    {
        require(
            elections[electionId].id != 0,
            "Election does not exist"
        );

        return electionVoterIdentities[
            electionId
        ].length;
    }

    // ============================================================
    // CAST VOTE
    // ============================================================
    // Kept owner-only in Phase 6/7.
    // Actual voter wallet authorization comes later.

    function castVote(
        uint256 electionId,
        bytes32 voterIdentityHash,
        uint256 candidateId
    )
        external
        onlyOwner
    {
        Election storage election =
            elections[electionId];

        require(
            election.id != 0,
            "Election does not exist"
        );

        require(
            election.status ==
                ElectionStatus.ACTIVE,
            "Election not active"
        );

        require(
            block.timestamp >=
                election.startTime,
            "Election has not started"
        );

        require(
            block.timestamp <
                election.endTime,
            "Election has ended"
        );

        require(
            eligibleVoter[
                electionId
            ][voterIdentityHash],
            "Voter not eligible"
        );

        require(
            !voterHasVoted[
                electionId
            ][voterIdentityHash],
            "Voter has already voted"
        );

        Candidate storage candidate =
            candidates[
                electionId
            ][candidateId];

        require(
            candidate.id != 0,
            "Candidate does not exist"
        );

        require(
            candidate.status ==
                CandidateStatus.ACTIVE,
            "Candidate not active"
        );

        voterHasVoted[
            electionId
        ][voterIdentityHash] = true;

        candidate.voteCount++;

        election.totalVotes++;

        emit VoteCast(
            electionId,
            voterIdentityHash,
            candidateId
        );
    }

    // ============================================================
    // PHASE 7 - GET ELECTION RESULT
    // ============================================================

    function getElectionResult(
        uint256 electionId
    )
        external
        view
        returns (ElectionResult memory)
    {
        require(
            elections[electionId].id != 0,
            "Election does not exist"
        );

        require(
            resultFinalized[electionId],
            "Result not finalized"
        );

        return electionResults[
            electionId
        ];
    }

    // ============================================================
    // PHASE 7 - CHECK RESULT EXISTS
    // ============================================================

    function hasElectionResult(
        uint256 electionId
    )
        external
        view
        returns (bool)
    {
        return resultFinalized[
            electionId
        ];
    }

    // ============================================================
    // PHASE 7 - VERIFY RESULT
    // ============================================================

    function verifyElectionResult(
        uint256 electionId
    )
        external
        view
        returns (bool)
    {
        require(
            elections[electionId].id != 0,
            "Election does not exist"
        );

        require(
            resultFinalized[electionId],
            "Result not finalized"
        );

        Election storage election =
            elections[electionId];

        ElectionResult storage result =
            electionResults[electionId];

        // Check stored election total
        if (
            election.totalVotes !=
            result.totalVotes
        ) {
            return false;
        }

        // Check stored eligible count
        if (
            election.eligibleVoterCount !=
            result.eligibleVoters
        ) {
            return false;
        }

        // Reconstruct candidate totals
        uint256 candidateVoteSum = 0;

        uint256 candidateCount =
            electionCandidateIds[
                electionId
            ].length;

        for (
            uint256 i = 0;
            i < candidateCount;
            i++
        ) {
            uint256 candidateId =
                electionCandidateIds[
                    electionId
                ][i];

            candidateVoteSum +=
                candidates[
                    electionId
                ][candidateId].voteCount;
        }

        if (
            candidateVoteSum !=
            result.totalVotes
        ) {
            return false;
        }

        bytes32 recalculatedHash =
            _calculateResultHash(
                result.electionId,
                result.totalVotes,
                result.eligibleVoters,
                result.turnoutBasisPoints,
                result.winnerCandidateId,
                result.winningVoteCount,
                result.isTie,
                result.hasVotes
            );

        return (
            recalculatedHash ==
            result.resultHash
        );
    }

    // ============================================================
    // GET ELECTION
    // ============================================================

    function getElection(
        uint256 electionId
    )
        external
        view
        returns (Election memory)
    {
        require(
            electionId > 0 &&
            electionId < nextElectionId,
            "Election does not exist"
        );

        return elections[
            electionId
        ];
    }

    // ============================================================
    // GET NEXT ELECTION ID
    // ============================================================

    function getNextElectionId()
        external
        view
        returns (uint256)
    {
        return nextElectionId;
    }

    // ============================================================
    // GET CANDIDATE
    // ============================================================

    function getCandidate(
        uint256 electionId,
        uint256 candidateId
    )
        external
        view
        returns (Candidate memory)
    {
        require(
            elections[electionId].id != 0,
            "Election does not exist"
        );

        require(
            candidates[
                electionId
            ][candidateId].id != 0,
            "Candidate does not exist"
        );

        return candidates[
            electionId
        ][candidateId];
    }

    // ============================================================
    // GET ALL CANDIDATE IDS
    // ============================================================

    function getCandidateIds(
        uint256 electionId
    )
        external
        view
        returns (uint256[] memory)
    {
        require(
            elections[electionId].id != 0,
            "Election does not exist"
        );

        return electionCandidateIds[
            electionId
        ];
    }

    // ============================================================
    // GET CANDIDATE COUNT
    // ============================================================

    function getCandidateCount(
        uint256 electionId
    )
        external
        view
        returns (uint256)
    {
        require(
            elections[electionId].id != 0,
            "Election does not exist"
        );

        return electionCandidateIds[
            electionId
        ].length;
    }
}