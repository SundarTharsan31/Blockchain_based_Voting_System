// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CollegeVoting {

    // ============================================================
    // OWNER
    // ============================================================

    address public owner;

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


    // Prevent duplicate candidate identity
    mapping(
        uint256 => mapping(
            bytes32 => bool
        )
    ) private candidateIdentityExists;


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
    // ELECTION CREATION
    // ============================================================

    function createElection(
        string calldata title,
        ElectionType electionType,
        uint256 startTime,
        uint256 endTime,
        uint256 eligibleVoterCount
    )
        external
        onlyOwner
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


        // First candidate ID starts from 1
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
    // ADD CANDIDATE
    // ============================================================

    function addCandidate(
        uint256 electionId,
        bytes32 identityHash,
        bytes32 metadataHash
    )
        external
        onlyOwner
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


        candidates[electionId][candidateId] =
            Candidate({
                id: candidateId,
                identityHash: identityHash,
                metadataHash: metadataHash,
                status: CandidateStatus.ACTIVE,
                voteCount: 0
            });


        electionCandidateIds[electionId]
            .push(candidateId);


        candidateIdentityExists[
            electionId
        ][identityHash] = true;


        nextCandidateId[electionId]++;


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
    // REMOVE CANDIDATE BEFORE ELECTION START
    // ============================================================

    function removeCandidate(
        uint256 electionId,
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
    // WITHDRAW CANDIDATE AFTER ELECTION START
    // ============================================================

    function withdrawCandidate(
        uint256 electionId,
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


        return elections[electionId];
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