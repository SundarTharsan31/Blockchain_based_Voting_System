import { expect } from "chai";
import { network } from "hardhat";

let ethers: any;

describe("CollegeVoting - Voter Identity & Eligibility", function () {

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

    async function createScheduledElection(voting: any) {
        const currentTime = BigInt(
            (await ethers.provider.getBlock("latest")).timestamp
        );

        const startTime = currentTime + 3600n;
        const endTime = startTime + 3600n;

        const tx = await voting.createElection(
            "Class Representative Election",
            0,
            startTime,
            endTime,
            0
        );

        await tx.wait();

        const electionId = 1n;

        await voting.scheduleElection(electionId);

        return electionId;
    }

    async function makeElectionActive(
        voting: any,
        electionId: bigint
    ) {
        const election = await voting.getElection(electionId);

        const currentTime = BigInt(
            (await ethers.provider.getBlock("latest")).timestamp
        );

        const startTime = BigInt(election.startTime);

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

        await voting.startElection(electionId);
    }

    // ==========================================
    // Register Voter
    // ==========================================

    describe("Voter Registration", function () {

        it("should register an eligible voter", async function () {

            const voting = await deployVoting();

            const electionId =
                await createScheduledElection(voting);

            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-001")
                );

            await voting.registerVoter(
                electionId,
                identityHash
            );

            expect(
                await voting.isEligibleVoter(
                    electionId,
                    identityHash
                )
            ).to.equal(true);
        });


        it("should register multiple voters", async function () {

            const voting = await deployVoting();

            const electionId =
                await createScheduledElection(voting);

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

            expect(
                await voting.isEligibleVoter(
                    electionId,
                    voter1
                )
            ).to.equal(true);

            expect(
                await voting.isEligibleVoter(
                    electionId,
                    voter2
                )
            ).to.equal(true);

            expect(
                await voting.isEligibleVoter(
                    electionId,
                    voter3
                )
            ).to.equal(true);

            expect(
                await voting.getVoterCount(electionId)
            ).to.equal(3n);
        });


        it("should reject duplicate voter identity", async function () {

            const voting = await deployVoting();

            const electionId =
                await createScheduledElection(voting);

            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-001")
                );

            await voting.registerVoter(
                electionId,
                identityHash
            );

            await expect(
                voting.registerVoter(
                    electionId,
                    identityHash
                )
            ).to.be.revertedWith(
                "Voter already registered"
            );
        });


        it("should reject an empty voter identity hash", async function () {

            const voting = await deployVoting();

            const electionId =
                await createScheduledElection(voting);

            await expect(
                voting.registerVoter(
                    electionId,
                    ethers.ZeroHash
                )
            ).to.be.revertedWith(
                "Identity hash required"
            );
        });

    });


    // ==========================================
    // Eligibility
    // ==========================================

    describe("Voter Eligibility", function () {

        it("should initially mark a registered voter as not voted", async function () {

            const voting = await deployVoting();

            const electionId =
                await createScheduledElection(voting);

            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-001")
                );

            await voting.registerVoter(
                electionId,
                identityHash
            );

            expect(
                await voting.hasVoted(
                    electionId,
                    identityHash
                )
            ).to.equal(false);
        });


        it("should revoke voter eligibility before election starts", async function () {

            const voting = await deployVoting();

            const electionId =
                await createScheduledElection(voting);

            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-001")
                );

            await voting.registerVoter(
                electionId,
                identityHash
            );

            await voting.revokeVoterEligibility(
                electionId,
                identityHash
            );

            expect(
                await voting.isEligibleVoter(
                    electionId,
                    identityHash
                )
            ).to.equal(false);
        });


        it("should reject revoking an unregistered voter", async function () {

            const voting = await deployVoting();

            const electionId =
                await createScheduledElection(voting);

            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-001")
                );

            await expect(
                voting.revokeVoterEligibility(
                    electionId,
                    identityHash
                )
            ).to.be.revertedWith(
                "Voter not registered"
            );
        });

    });


    // ==========================================
    // Lock Eligibility After Election Starts
    // ==========================================

    describe("Eligibility Lock", function () {

        it("should lock voter registration after election starts", async function () {

            const voting = await deployVoting();

            const electionId =
                await createScheduledElection(voting);

            await makeElectionActive(
                voting,
                electionId
            );

            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-001")
                );

            await expect(
                voting.registerVoter(
                    electionId,
                    identityHash
                )
            ).to.be.revertedWith(
                "Voter registration locked"
            );
        });


        it("should lock voter eligibility changes after election starts", async function () {

            const voting = await deployVoting();

            const electionId =
                await createScheduledElection(voting);

            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-001")
                );

            await voting.registerVoter(
                electionId,
                identityHash
            );

            await makeElectionActive(
                voting,
                electionId
            );

            await expect(
                voting.revokeVoterEligibility(
                    electionId,
                    identityHash
                )
            ).to.be.revertedWith(
                "Voter registration locked"
            );
        });

    });


    // ==========================================
    // Non-Owner Authorization
    // ==========================================

    describe("Voter Authorization", function () {

        it("should reject voter registration by a non-owner", async function () {

            const voting = await deployVoting();

            const [, nonOwner] =
                await ethers.getSigners();

            const electionId =
                await createScheduledElection(voting);

            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-001")
                );

            await expect(
                voting.connect(nonOwner).registerVoter(
                    electionId,
                    identityHash
                )
            ).to.be.revertedWith(
                "Only owner"
            );
        });


        it("should reject voter eligibility revocation by a non-owner", async function () {

            const voting = await deployVoting();

            const [, nonOwner] =
                await ethers.getSigners();

            const electionId =
                await createScheduledElection(voting);

            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-001")
                );

            await voting.registerVoter(
                electionId,
                identityHash
            );

            await expect(
                voting.connect(nonOwner).revokeVoterEligibility(
                    electionId,
                    identityHash
                )
            ).to.be.revertedWith(
                "Only owner"
            );
        });

    });


    // ==========================================
    // Election-Specific Eligibility
    // ==========================================

    describe("Election Isolation", function () {

        it("should keep voter eligibility separate between elections", async function () {

            const voting = await deployVoting();

            const election1 =
                await createScheduledElection(voting);

            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes("STUDENT-001")
                );

            await voting.registerVoter(
                election1,
                identityHash
            );

            const currentTime = BigInt(
                (await ethers.provider.getBlock("latest")).timestamp
            );

            const startTime =
                currentTime + 7200n;

            const endTime =
                startTime + 3600n;

            await voting.createElection(
                "Department Representative Election",
                1,
                startTime,
                endTime,
                0
            );

            const election2 = 2n;

            await voting.scheduleElection(
                election2
            );

            expect(
                await voting.isEligibleVoter(
                    election1,
                    identityHash
                )
            ).to.equal(true);

            expect(
                await voting.isEligibleVoter(
                    election2,
                    identityHash
                )
            ).to.equal(false);
        });

    });

});