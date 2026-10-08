import { expect } from "chai";
import { network } from "hardhat";

let ethers: any;

describe("CollegeVoting - Voting & One-Person-One-Vote", function () {

    before(async function () {
        const connection = await network.connect();
        ethers = connection.ethers;
    });

    async function deployVoting() {
        const Voting = await ethers.getContractFactory("CollegeVoting");
        const voting = await Voting.deploy();
        await voting.waitForDeployment();

        return voting;
    }

    async function createElection(voting: any) {

        const currentTime = BigInt(
            (await ethers.provider.getBlock("latest")).timestamp
        );

        const startTime = currentTime + 3600n;
        const endTime = startTime + 3600n;

        await voting.createElection(
            "Class Representative Election",
            0,
            startTime,
            endTime,
            0
        );

        await voting.scheduleElection(1);

        return 1n;
    }

    async function registerCandidateAndVoter(voting: any) {

        const electionId =
            await createElection(voting);

        const candidateHash =
            ethers.keccak256(
                ethers.toUtf8Bytes("CANDIDATE-001")
            );

        const voterHash =
            ethers.keccak256(
                ethers.toUtf8Bytes("STUDENT-001")
            );

        await voting.addCandidate(
            electionId,
            candidateHash,
            ethers.keccak256(
                ethers.toUtf8Bytes("Candidate metadata")
            )
        );

        await voting.registerVoter(
            electionId,
            voterHash
        );

        return {
            electionId,
            candidateHash,
            voterHash
        };
    }

    async function startElection(
        voting: any,
        electionId: bigint
    ) {

        const election =
            await voting.getElection(electionId);

        const currentTime = BigInt(
            (await ethers.provider.getBlock("latest")).timestamp
        );

        const startTime =
            BigInt(election.startTime);

        if (currentTime < startTime) {

            await ethers.provider.send(
                "evm_increaseTime",
                [Number(startTime - currentTime)]
            );

            await ethers.provider.send(
                "evm_mine",
                []
            );
        }

        await voting.startElection(
            electionId
        );
    }


    // ============================================================
    // BASIC VOTING
    // ============================================================

    describe("Cast Vote", function () {

        it("should cast a valid vote", async function () {

            const voting =
                await deployVoting();

            const {
                electionId,
                voterHash
            } =
                await registerCandidateAndVoter(
                    voting
                );

            await startElection(
                voting,
                electionId
            );

            await voting.castVote(
                electionId,
                voterHash,
                1
            );

            expect(
                await voting.hasVoted(
                    electionId,
                    voterHash
                )
            ).to.equal(true);

            const election =
                await voting.getElection(
                    electionId
                );

            expect(
                election.totalVotes
            ).to.equal(1n);

            const candidate =
                await voting.getCandidate(
                    electionId,
                    1
                );

            expect(
                candidate.voteCount
            ).to.equal(1n);
        });


        it("should emit VoteCast event", async function () {

            const voting =
                await deployVoting();

            const {
                electionId,
                voterHash
            } =
                await registerCandidateAndVoter(
                    voting
                );

            await startElection(
                voting,
                electionId
            );

            await expect(
                voting.castVote(
                    electionId,
                    voterHash,
                    1
                )
            ).to.emit(
                voting,
                "VoteCast"
            );
        });


        it("should allow multiple eligible voters to vote", async function () {

            const voting =
                await deployVoting();

            const electionId =
                await createElection(voting);

            const candidateHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("CANDIDATE-001")
                );

            await voting.addCandidate(
                electionId,
                candidateHash,
                ethers.ZeroHash
            );

            const voter1 =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-001")
                );

            const voter2 =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-002")
                );

            const voter3 =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-003")
                );

            await voting.registerVoter(
                electionId,
                voter1
            );

            await voting.registerVoter(
                electionId,
                voter2
            );

            await voting.registerVoter(
                electionId,
                voter3
            );

            await startElection(
                voting,
                electionId
            );

            await voting.castVote(
                electionId,
                voter1,
                1
            );

            await voting.castVote(
                electionId,
                voter2,
                1
            );

            await voting.castVote(
                electionId,
                voter3,
                1
            );

            const candidate =
                await voting.getCandidate(
                    electionId,
                    1
                );

            expect(
                candidate.voteCount
            ).to.equal(3n);

            const election =
                await voting.getElection(
                    electionId
                );

            expect(
                election.totalVotes
            ).to.equal(3n);
        });

    });


    // ============================================================
    // ONE PERSON ONE VOTE
    // ============================================================

    describe("One Person One Vote", function () {

        it("should reject a second vote from the same voter", async function () {

            const voting =
                await deployVoting();

            const {
                electionId,
                voterHash
            } =
                await registerCandidateAndVoter(
                    voting
                );

            await startElection(
                voting,
                electionId
            );

            await voting.castVote(
                electionId,
                voterHash,
                1
            );

            await expect(
                voting.castVote(
                    electionId,
                    voterHash,
                    1
                )
            ).to.be.revertedWith(
                "Voter has already voted"
            );
        });

    });


    // ============================================================
    // VOTER VALIDATION
    // ============================================================

    describe("Voter Validation", function () {

        it("should reject an ineligible voter", async function () {

            const voting =
                await deployVoting();

            const electionId =
                await createElection(voting);

            await voting.addCandidate(
                electionId,
                ethers.keccak256(
                    ethers.toUtf8Bytes("CANDIDATE-001")
                ),
                ethers.ZeroHash
            );

            const voterHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-999")
                );

            await startElection(
                voting,
                electionId
            );

            await expect(
                voting.castVote(
                    electionId,
                    voterHash,
                    1
                )
            ).to.be.revertedWith(
                "Voter not eligible"
            );
        });

    });


    // ============================================================
    // CANDIDATE VALIDATION
    // ============================================================

    describe("Candidate Validation", function () {

        it("should reject a non-existent candidate", async function () {

            const voting =
                await deployVoting();

            const {
                electionId,
                voterHash
            } =
                await registerCandidateAndVoter(
                    voting
                );

            await startElection(
                voting,
                electionId
            );

            await expect(
                voting.castVote(
                    electionId,
                    voterHash,
                    999
                )
            ).to.be.revertedWith(
                "Candidate does not exist"
            );
        });


        it("should reject a removed candidate", async function () {

            const voting =
                await deployVoting();

            const electionId =
                await createElection(voting);

            const candidateHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("CANDIDATE-001")
                );

            const voterHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-001")
                );

            await voting.addCandidate(
                electionId,
                candidateHash,
                ethers.ZeroHash
            );

            await voting.registerVoter(
                electionId,
                voterHash
            );

            await voting.removeCandidate(
                electionId,
                1
            );

            await startElection(
                voting,
                electionId
            );

            await expect(
                voting.castVote(
                    electionId,
                    voterHash,
                    1
                )
            ).to.be.revertedWith(
                "Candidate not active"
            );
        });


        it("should reject a withdrawn candidate", async function () {

            const voting =
                await deployVoting();

            const {
                electionId,
                voterHash
            } =
                await registerCandidateAndVoter(
                    voting
                );

            await startElection(
                voting,
                electionId
            );

            await voting.withdrawCandidate(
                electionId,
                1
            );

            await expect(
                voting.castVote(
                    electionId,
                    voterHash,
                    1
                )
            ).to.be.revertedWith(
                "Candidate not active"
            );
        });

    });


    // ============================================================
    // ELECTION STATUS VALIDATION
    // ============================================================

    describe("Election Status", function () {

        it("should reject voting in a paused election", async function () {

            const voting =
                await deployVoting();

            const {
                electionId,
                voterHash
            } =
                await registerCandidateAndVoter(
                    voting
                );

            await startElection(
                voting,
                electionId
            );

            await voting.pauseElection(
                electionId
            );

            await expect(
                voting.castVote(
                    electionId,
                    voterHash,
                    1
                )
            ).to.be.revertedWith(
                "Election not active"
            );
        });


        it("should reject voting in a non-existent election", async function () {

            const voting =
                await deployVoting();

            const voterHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-001")
                );

            await expect(
                voting.castVote(
                    999,
                    voterHash,
                    1
                )
            ).to.be.revertedWith(
                "Election does not exist"
            );
        });

    });


    // ============================================================
    // AUTHORIZATION
    // ============================================================

    describe("Authorization", function () {

        it("should reject voting by a non-owner", async function () {

            const voting =
                await deployVoting();

            const [, nonOwner] =
                await ethers.getSigners();

            const {
                electionId,
                voterHash
            } =
                await registerCandidateAndVoter(
                    voting
                );

            await startElection(
                voting,
                electionId
            );

            await expect(
                voting.connect(nonOwner).castVote(
                    electionId,
                    voterHash,
                    1
                )
            ).to.be.revertedWith(
                "Only owner"
            );
        });

    });

});