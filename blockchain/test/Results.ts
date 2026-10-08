import { expect } from "chai";
import { network } from "hardhat";

let ethers: any;

describe("Phase 7 - Result Finalization & Verification", function () {
    let voting: any;

    let owner: any;
    let admin: any;

    let voter1: any;
    let voter2: any;
    let voter3: any;
    let voter4: any;

    before(async function () {
        const connection = await network.connect();
        ethers = connection.ethers;
    });

    // ============================================================
    // HELPER: MOVE BLOCKCHAIN TIME
    // ============================================================

    async function moveTime(seconds: number) {
        await ethers.provider.send(
            "evm_increaseTime",
            [seconds]
        );

        await ethers.provider.send(
            "evm_mine",
            []
        );
    }

    // ============================================================
    // HELPER: CREATE BASIC ELECTION
    // ============================================================

    async function createElection() {
        const signers = await ethers.getSigners();

        owner = signers[0];
        admin = signers[1];
        voter1 = signers[2];
        voter2 = signers[3];
        voter3 = signers[4];
        voter4 = signers[5];

        const CollegeVoting =
            await ethers.getContractFactory("CollegeVoting");

        voting = await CollegeVoting.deploy();

        await voting.waitForDeployment();

        await voting.addAdmin(
            admin.address
        );

        const latestBlock =
            await ethers.provider.getBlock(
                "latest"
            );

        const currentTime =
            Number(latestBlock.timestamp);

        const startTime =
            currentTime + 60;

        const endTime =
            currentTime + 3600;

        await voting.createElection(
            "CSE Class Representative",
            0,
            startTime,
            endTime,
            0
        );

        return {
            electionId: 1,
            startTime,
            endTime
        };
    }

    // ============================================================
    // HELPER: PREPARE ELECTION WITH TWO CANDIDATES
    // ============================================================

    async function prepareElection() {
        const {
            electionId
        } = await createElection();

        const candidate1Hash =
            ethers.keccak256(
                ethers.toUtf8Bytes(
                    "Candidate A"
                )
            );

        const candidate2Hash =
            ethers.keccak256(
                ethers.toUtf8Bytes(
                    "Candidate B"
                )
            );

        const metadata1Hash =
            ethers.keccak256(
                ethers.toUtf8Bytes(
                    "Candidate A Metadata"
                )
            );

        const metadata2Hash =
            ethers.keccak256(
                ethers.toUtf8Bytes(
                    "Candidate B Metadata"
                )
            );

        await voting.addCandidate(
            electionId,
            candidate1Hash,
            metadata1Hash
        );

        await voting.addCandidate(
            electionId,
            candidate2Hash,
            metadata2Hash
        );

        return electionId;
    }

    // ============================================================
    // HELPER: REGISTER VOTERS
    // ============================================================

    async function registerVoters(
        electionId: number,
        count: number
    ) {
        const voters = [
            voter1,
            voter2,
            voter3,
            voter4
        ];

        for (
            let i = 0;
            i < count;
            i++
        ) {
            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        `voter-${i + 1}`
                    )
                );

            await voting.registerVoter(
                electionId,
                identityHash
            );
        }
    }

    // ============================================================
    // HELPER: START ELECTION
    // ============================================================

    async function startElection(
        electionId: number
    ) {
        await voting.scheduleElection(
            electionId
        );

        await moveTime(70);

        await voting.startElection(
            electionId
        );
    }

    // ============================================================
    // HELPER: FINISH ELECTION
    // ============================================================

    async function finishElection(
        electionId: number
    ) {
        await moveTime(3600);

        await voting.endElection(
            electionId
        );
    }

    // ============================================================
    // TEST 1
    // ============================================================

    it(
        "should create a finalized election result",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                3
            );

            await startElection(
                electionId
            );

            const voter1Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-1"
                    )
                );

            const voter2Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-2"
                    )
                );

            const voter3Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-3"
                    )
                );

            await voting.castVote(
                electionId,
                voter1Hash,
                1
            );

            await voting.castVote(
                electionId,
                voter2Hash,
                1
            );

            await voting.castVote(
                electionId,
                voter3Hash,
                2
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            expect(
                await voting.hasElectionResult(
                    electionId
                )
            ).to.equal(true);
        }
    );

    // ============================================================
    // TEST 2
    // ============================================================

    it(
        "should store the correct total votes",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                3
            );

            await startElection(
                electionId
            );

            const voter1Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-1"
                    )
                );

            const voter2Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-2"
                    )
                );

            await voting.castVote(
                electionId,
                voter1Hash,
                1
            );

            await voting.castVote(
                electionId,
                voter2Hash,
                2
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            const result =
                await voting.getElectionResult(
                    electionId
                );

            expect(
                result.totalVotes
            ).to.equal(2);
        }
    );

    // ============================================================
    // TEST 3
    // ============================================================

    it(
        "should store the correct eligible voter count",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                4
            );

            await startElection(
                electionId
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            const result =
                await voting.getElectionResult(
                    electionId
                );

            expect(
                result.eligibleVoters
            ).to.equal(4);
        }
    );

    // ============================================================
    // TEST 4
    // ============================================================

    it(
        "should calculate turnout correctly",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                4
            );

            await startElection(
                electionId
            );

            const voter1Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-1"
                    )
                );

            const voter2Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-2"
                    )
                );

            const voter3Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-3"
                    )
                );

            await voting.castVote(
                electionId,
                voter1Hash,
                1
            );

            await voting.castVote(
                electionId,
                voter2Hash,
                1
            );

            await voting.castVote(
                electionId,
                voter3Hash,
                2
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            const result =
                await voting.getElectionResult(
                    electionId
                );

            // 3 / 4 = 75%
            // 75% = 7500 basis points
            expect(
                result.turnoutBasisPoints
            ).to.equal(7500);
        }
    );

    // ============================================================
    // TEST 5
    // ============================================================

    it(
        "should determine the correct winner",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                3
            );

            await startElection(
                electionId
            );

            const voter1Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-1"
                    )
                );

            const voter2Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-2"
                    )
                );

            const voter3Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-3"
                    )
                );

            await voting.castVote(
                electionId,
                voter1Hash,
                1
            );

            await voting.castVote(
                electionId,
                voter2Hash,
                1
            );

            await voting.castVote(
                electionId,
                voter3Hash,
                2
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            const result =
                await voting.getElectionResult(
                    electionId
                );

            expect(
                result.winnerCandidateId
            ).to.equal(1);

            expect(
                result.winningVoteCount
            ).to.equal(2);

            expect(
                result.isTie
            ).to.equal(false);
        }
    );

    // ============================================================
    // TEST 6 - RESULT HASH
    // ============================================================

    it(
        "should generate a non-zero result hash",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                2
            );

            await startElection(
                electionId
            );

            const voter1Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-1"
                    )
                );

            await voting.castVote(
                electionId,
                voter1Hash,
                1
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            const result =
                await voting.getElectionResult(
                    electionId
                );

            expect(
                result.resultHash
            ).to.not.equal(
                ethers.ZeroHash
            );
        }
    );

    // ============================================================
    // TEST 7 - HASH VERIFICATION
    // ============================================================

    it(
        "should verify the stored result hash",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                2
            );

            await startElection(
                electionId
            );

            const voter1Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-1"
                    )
                );

            const voter2Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-2"
                    )
                );

            await voting.castVote(
                electionId,
                voter1Hash,
                1
            );

            await voting.castVote(
                electionId,
                voter2Hash,
                2
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            expect(
                await voting.verifyElectionResult(
                    electionId
                )
            ).to.equal(true);
        }
    );

    // ============================================================
    // TEST 8 - FINALIZING STATUS
    // ============================================================

    it(
        "should move election to FINALIZING",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                2
            );

            await startElection(
                electionId
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            const election =
                await voting.getElection(
                    electionId
                );

            // ElectionStatus.FINALIZING = 5
            expect(
                election.status
            ).to.equal(5);
        }
    );

    // ============================================================
    // TEST 9 - PUBLISH
    // ============================================================

    it(
        "should publish after result finalization",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                2
            );

            await startElection(
                electionId
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            await voting.publishElection(
                electionId
            );

            const election =
                await voting.getElection(
                    electionId
                );

            // ElectionStatus.PUBLISHED = 6
            expect(
                election.status
            ).to.equal(6);
        }
    );

    // ============================================================
    // TEST 10 - FINALIZER
    // ============================================================

    it(
        "should record who finalized the result",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                2
            );

            await startElection(
                electionId
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            const result =
                await voting.getElectionResult(
                    electionId
                );

            expect(
                result.finalizedBy
            ).to.equal(
                owner.address
            );
        }
    );

    // ============================================================
    // TEST 11 - TIMESTAMP
    // ============================================================

    it(
        "should record a finalization timestamp",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                1
            );

            await startElection(
                electionId
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            const result =
                await voting.getElectionResult(
                    electionId
                );

            expect(
                result.finalizedAt
            ).to.be.greaterThan(0);
        }
    );

    // ============================================================
    // TEST 12 - NO VOTES
    // ============================================================

    it(
        "should correctly handle an election with no votes",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                3
            );

            await startElection(
                electionId
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            const result =
                await voting.getElectionResult(
                    electionId
                );

            expect(
                result.totalVotes
            ).to.equal(0);

            expect(
                result.hasVotes
            ).to.equal(false);

            expect(
                result.winnerCandidateId
            ).to.equal(0);

            expect(
                result.winningVoteCount
            ).to.equal(0);

            expect(
                result.isTie
            ).to.equal(false);

            expect(
                result.turnoutBasisPoints
            ).to.equal(0);
        }
    );

    // ============================================================
    // TEST 13 - TIE
    // ============================================================

    it(
        "should correctly detect a tie",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                4
            );

            await startElection(
                electionId
            );

            const voter1Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-1"
                    )
                );

            const voter2Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-2"
                    )
                );

            const voter3Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-3"
                    )
                );

            const voter4Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-4"
                    )
                );

            await voting.castVote(
                electionId,
                voter1Hash,
                1
            );

            await voting.castVote(
                electionId,
                voter2Hash,
                1
            );

            await voting.castVote(
                electionId,
                voter3Hash,
                2
            );

            await voting.castVote(
                electionId,
                voter4Hash,
                2
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            const result =
                await voting.getElectionResult(
                    electionId
                );

            expect(
                result.totalVotes
            ).to.equal(4);

            expect(
                result.isTie
            ).to.equal(true);

            expect(
                result.winnerCandidateId
            ).to.equal(0);

            expect(
                result.winningVoteCount
            ).to.equal(2);

            expect(
                result.hasVotes
            ).to.equal(true);
        }
    );

    // ============================================================
    // TEST 14 - ADMIN FINALIZATION
    // ============================================================

    it(
        "should allow an admin to finalize the result",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                2
            );

            await startElection(
                electionId
            );

            const voter1Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-1"
                    )
                );

            await voting.castVote(
                electionId,
                voter1Hash,
                1
            );

            await finishElection(
                electionId
            );

            await voting
                .connect(admin)
                .finalizeElection(
                    electionId
                );

            const result =
                await voting.getElectionResult(
                    electionId
                );

            expect(
                result.finalizedBy
            ).to.equal(
                admin.address
            );
        }
    );

    // ============================================================
    // TEST 15 - UNAUTHORIZED FINALIZATION
    // ============================================================

    it(
        "should reject result finalization by unauthorized users",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                2
            );

            await startElection(
                electionId
            );

            await finishElection(
                electionId
            );

            const signers =
                await ethers.getSigners();

            const unauthorized =
                signers[6];

            await expect(
                voting
                    .connect(unauthorized)
                    .finalizeElection(
                        electionId
                    )
            ).to.be.revertedWith(
                "Only owner"
            );
        }
    );

    // ============================================================
    // TEST 16 - RESULT DOES NOT EXIST BEFORE FINALIZATION
    // ============================================================

    it(
        "should reject result lookup before finalization",
        async function () {
            const electionId =
                await prepareElection();

            expect(
                await voting.hasElectionResult(
                    electionId
                )
            ).to.equal(false);

            await expect(
                voting.getElectionResult(
                    electionId
                )
            ).to.be.revertedWith(
                "Result not finalized"
            );
        }
    );

    // ============================================================
    // TEST 17 - PUBLISHING BEFORE FINALIZATION
    // ============================================================

    it(
    "should reject publishing before result finalization",
    async function () {
        const electionId =
            await prepareElection();

        await expect(
            voting.publishElection(
                electionId
            )
        ).to.be.revert(ethers);
    }
);

    // ============================================================
    // TEST 18 - CANDIDATE TOTAL CROSS CHECK
    // ============================================================

    it(
        "should produce a verified result when candidate totals match total votes",
        async function () {
            const electionId =
                await prepareElection();

            await registerVoters(
                electionId,
                4
            );

            await startElection(
                electionId
            );

            const voter1Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-1"
                    )
                );

            const voter2Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-2"
                    )
                );

            const voter3Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-3"
                    )
                );

            const voter4Hash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "voter-4"
                    )
                );

            await voting.castVote(
                electionId,
                voter1Hash,
                1
            );

            await voting.castVote(
                electionId,
                voter2Hash,
                1
            );

            await voting.castVote(
                electionId,
                voter3Hash,
                2
            );

            await voting.castVote(
                electionId,
                voter4Hash,
                2
            );

            await finishElection(
                electionId
            );

            await voting.finalizeElection(
                electionId
            );

            expect(
                await voting.verifyElectionResult(
                    electionId
                )
            ).to.equal(true);
        }
    );
});