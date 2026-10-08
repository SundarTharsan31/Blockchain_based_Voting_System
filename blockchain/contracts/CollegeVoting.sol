// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CollegeVoting {

    // ============================================================
    // OWNER + ADMIN GOVERNANCE
    // ============================================================

    address public owner;

    // Phase 5: Election administrators
    mapping(address => bool) private electionAdmins;
    address[] private adminList;

    constructor() {
        owner = msg.sender;
    }

    // Owner / Super Admin only
    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only owner"
        );
        _;
    }

    // Owner or approved Election Admin
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

    // Whether a voter is eligible for an election.
    mapping(
        uint256 => mapping(
            bytes32 => bool
        )
    ) private eligibleVoter;

    // Whether a voter has already voted.
    mapping(
        uint256 => mapping(
            bytes32 => bool
        )
    ) private voterHasVoted;

    // Prevent duplicate voter registration.
    mapping(
        uint256 => mapping(
            bytes32 => bool
        )
    ) private voterIdentityExists;

    // Registered voter identity hashes.
    mapping(
        uint256 => bytes32[]
    ) private electionVoterIdentities;


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
    // PHASE 5 - ADMIN EVENTS
    // ============================================================

    event AdminAdded(
        address indexed admin
    );

    event AdminRemoved(
        address indexed admin
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
    // PHASE 5 - ADD ADMIN
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


    // ============================================================
    // PHASE 5 - REMOVE ADMIN
    // ============================================================

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

        // Remove from array using swap-and-pop
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


    // ============================================================
    // PHASE 5 - CHECK ADMIN
    // ============================================================

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


    // ============================================================
    // PHASE 5 - GET ADMIN COUNT
    // ============================================================

    function getAdminCount()
        external
        view
        returns (uint256)
    {
        return adminList.length;
    }


    // ============================================================
    // PHASE 5 - GET ADMIN BY INDEX
    // ============================================================

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
    // FINALIZE ELECTION
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

        election.status =
            ElectionStatus.FINALIZING;

        emit ElectionFinalizing(
            electionId
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
    // Critical security action remains owner-only in Phase 5.

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
    // Critical security action remains owner-only in Phase 5.

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
    // Kept owner-only for Phase 5.
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

        // Mark voter as having voted.
        voterHasVoted[
            electionId
        ][voterIdentityHash] = true;

        // Increase candidate vote count.
        candidate.voteCount++;

        // Increase total election vote count.
        election.totalVotes++;

        emit VoteCast(
            electionId,
            voterIdentityHash,
            candidateId
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