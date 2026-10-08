import { expect } from "chai";
import { network } from "hardhat";

describe("CollegeVoting - Election Foundation", function () {

    // ============================================================
    // HARDHAT 3 ETHER CONNECTION
    // ============================================================

    let ethers: any;

    before(async function () {
        const connection = await network.connect();
        ethers = connection.ethers;
    });


    // ============================================================
    // DEPLOYMENT HELPER
    // ============================================================

    async function deployVoting() {

        const [owner, otherAccount] =
            await ethers.getSigners();

        const voting =
            await ethers.deployContract("CollegeVoting");

        await voting.waitForDeployment();

        return {
            voting,
            owner,
            otherAccount
        };
    }


    // ============================================================
    // GET ELECTION TIMES
    // ============================================================

    async function getElectionTimes(
        voting: any,
        electionId: bigint
    ) {

        const election =
            await voting.getElection(electionId);

        return {
            startTime: election.startTime,
            endTime: election.endTime
        };
    }


    // ============================================================
    // CREATE + SCHEDULE ELECTION
    // ============================================================

    async function createScheduledElection(
        voting: any
    ) {

        const latestBlock =
            await ethers.provider.getBlock("latest");

        if (!latestBlock) {
            throw new Error(
                "Could not get latest block"
            );
        }

        const currentTime =
            BigInt(latestBlock.timestamp);

        const startTime =
            currentTime + 3600n;

        const endTime =
            currentTime + 7200n;


        await voting.createElection(
            "Class Representative Election",
            0, // CLASS_REP
            startTime,
            endTime,
            100
        );


        await voting.scheduleElection(1);


        return {
            electionId: 1n,
            startTime,
            endTime
        };
    }


    // ============================================================
    // MOVE ELECTION TO ACTIVE
    // ============================================================

    async function makeElectionActive(
        voting: any
    ) {

        const { startTime } =
            await getElectionTimes(
                voting,
                1n
            );


        const latestBlock =
            await ethers.provider.getBlock(
                "latest"
            );

        if (!latestBlock) {
            throw new Error(
                "Could not get latest block"
            );
        }


        const currentTime =
            BigInt(
                latestBlock.timestamp
            );


        if (currentTime < startTime) {

            await ethers.provider.send(
                "evm_increaseTime",
                [
                    Number(
                        startTime - currentTime
                    )
                ]
            );


            await ethers.provider.send(
                "evm_mine",
                []
            );
        }


        await voting.startElection(1);
    }


    // ============================================================
    // MOVE ELECTION TO ENDED
    // ============================================================

    async function makeElectionEnded(
        voting: any
    ) {

        const { endTime } =
            await getElectionTimes(
                voting,
                1n
            );


        const latestBlock =
            await ethers.provider.getBlock(
                "latest"
            );

        if (!latestBlock) {
            throw new Error(
                "Could not get latest block"
            );
        }


        const currentTime =
            BigInt(
                latestBlock.timestamp
            );


        if (currentTime < endTime) {

            await ethers.provider.send(
                "evm_increaseTime",
                [
                    Number(
                        endTime - currentTime
                    )
                ]
            );


            await ethers.provider.send(
                "evm_mine",
                []
            );
        }


        await voting.endElection(1);
    }


    // ============================================================
    // DEPLOYMENT TESTS
    // ============================================================

    describe("Deployment", function () {

        it(
            "should deploy the contract correctly",
            async function () {

                const {
                    voting,
                    owner
                } = await deployVoting();


                expect(
                    await voting.owner()
                ).to.equal(
                    owner.address
                );


                expect(
                    await voting.getNextElectionId()
                ).to.equal(1n);
            }
        );

    });


    // ============================================================
    // CREATE ELECTION TESTS
    // ============================================================

    describe("Create Election", function () {

        it(
            "should create an election in DRAFT status",
            async function () {

                const { voting } =
                    await deployVoting();


                const latestBlock =
                    await ethers.provider.getBlock(
                        "latest"
                    );


                if (!latestBlock) {
                    throw new Error(
                        "Could not get latest block"
                    );
                }


                const currentTime =
                    BigInt(
                        latestBlock.timestamp
                    );


                const startTime =
                    currentTime + 3600n;


                const endTime =
                    currentTime + 7200n;


                await expect(
                    voting.createElection(
                        "Student Council Election",
                        2,
                        startTime,
                        endTime,
                        500
                    )
                ).to.emit(
                    voting,
                    "ElectionCreated"
                );


                const election =
                    await voting.getElection(1);


                expect(election.id)
                    .to.equal(1n);


                expect(election.title)
                    .to.equal(
                        "Student Council Election"
                    );


                expect(election.electionType)
                    .to.equal(2);


                expect(election.status)
                    .to.equal(0);


                expect(election.startTime)
                    .to.equal(startTime);


                expect(election.endTime)
                    .to.equal(endTime);


                expect(election.eligibleVoterCount)
                    .to.equal(500n);


                expect(election.totalVotes)
                    .to.equal(0n);
            }
        );


        it(
            "should reject an empty election title",
            async function () {

                const { voting } =
                    await deployVoting();


                const latestBlock =
                    await ethers.provider.getBlock(
                        "latest"
                    );


                if (!latestBlock) {
                    throw new Error(
                        "Could not get latest block"
                    );
                }


                const currentTime =
                    BigInt(
                        latestBlock.timestamp
                    );


                const startTime =
                    currentTime + 3600n;


                const endTime =
                    currentTime + 7200n;


                await expect(
                    voting.createElection(
                        "",
                        0,
                        startTime,
                        endTime,
                        100
                    )
                ).to.be.revertedWith(
                    "Title required"
                );
            }
        );


        it(
            "should reject an invalid election time",
            async function () {

                const { voting } =
                    await deployVoting();


                const latestBlock =
                    await ethers.provider.getBlock(
                        "latest"
                    );


                if (!latestBlock) {
                    throw new Error(
                        "Could not get latest block"
                    );
                }


                const currentTime =
                    BigInt(
                        latestBlock.timestamp
                    );


                const startTime =
                    currentTime + 7200n;


                const endTime =
                    currentTime + 3600n;


                await expect(
                    voting.createElection(
                        "Invalid Election",
                        0,
                        startTime,
                        endTime,
                        100
                    )
                ).to.be.revertedWith(
                    "Invalid election time"
                );
            }
        );


        it(
            "should reject an election whose start time is not in the future",
            async function () {

                const { voting } =
                    await deployVoting();


                const latestBlock =
                    await ethers.provider.getBlock(
                        "latest"
                    );


                if (!latestBlock) {
                    throw new Error(
                        "Could not get latest block"
                    );
                }


                const currentTime =
                    BigInt(
                        latestBlock.timestamp
                    );


                const startTime =
                    currentTime;


                const endTime =
                    currentTime + 3600n;


                await expect(
                    voting.createElection(
                        "Past Election",
                        0,
                        startTime,
                        endTime,
                        100
                    )
                ).to.be.revertedWith(
                    "Start time must be future"
                );
            }
        );

    });


    // ============================================================
    // OWNER AUTHORIZATION
    // ============================================================

    describe("Owner Authorization", function () {

        it(
            "should reject election creation from a non-owner",
            async function () {

                const {
                    voting,
                    otherAccount
                } = await deployVoting();


                const latestBlock =
                    await ethers.provider.getBlock(
                        "latest"
                    );


                if (!latestBlock) {
                    throw new Error(
                        "Could not get latest block"
                    );
                }


                const currentTime =
                    BigInt(
                        latestBlock.timestamp
                    );


                const startTime =
                    currentTime + 3600n;


                const endTime =
                    currentTime + 7200n;


                await expect(
                    voting
                        .connect(otherAccount)
                        .createElection(
                            "Unauthorized Election",
                            0,
                            startTime,
                            endTime,
                            100
                        )
                ).to.be.revertedWith(
                    "Only owner"
                );
            }
        );

    });


    // ============================================================
    // SCHEDULE ELECTION
    // ============================================================

    describe("Schedule Election", function () {

        it(
            "should schedule a DRAFT election",
            async function () {

                const { voting } =
                    await deployVoting();


                const latestBlock =
                    await ethers.provider.getBlock(
                        "latest"
                    );


                if (!latestBlock) {
                    throw new Error(
                        "Could not get latest block"
                    );
                }


                const currentTime =
                    BigInt(
                        latestBlock.timestamp
                    );


                await voting.createElection(
                    "Department Election",
                    1,
                    currentTime + 3600n,
                    currentTime + 7200n,
                    200
                );


                await expect(
                    voting.scheduleElection(1)
                ).to.emit(
                    voting,
                    "ElectionScheduled"
                );


                const election =
                    await voting.getElection(1);


                expect(election.status)
                    .to.equal(1);
            }
        );


        it(
            "should reject scheduling an election that is not DRAFT",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await expect(
                    voting.scheduleElection(1)
                ).to.be.revertedWith(
                    "Election not in draft"
                );
            }
        );

    });


    // ============================================================
    // START ELECTION
    // ============================================================

    describe("Start Election", function () {

        it(
            "should not start an election before its start time",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await expect(
                    voting.startElection(1)
                ).to.be.revertedWith(
                    "Election has not started"
                );
            }
        );


        it(
            "should start an election after its start time",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                const election =
                    await voting.getElection(1);


                expect(election.status)
                    .to.equal(2);
            }
        );

    });


    // ============================================================
    // PAUSE ELECTION
    // ============================================================

    describe("Pause Election", function () {

        it(
            "should pause an active election",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                await expect(
                    voting.pauseElection(1)
                ).to.emit(
                    voting,
                    "ElectionPaused"
                );


                const election =
                    await voting.getElection(1);


                expect(election.status)
                    .to.equal(3);
            }
        );


        it(
            "should reject pausing an election that is not active",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await expect(
                    voting.pauseElection(1)
                ).to.be.revertedWith(
                    "Election not active"
                );
            }
        );

    });


    // ============================================================
    // RESUME ELECTION
    // ============================================================

    describe("Resume Election", function () {

        it(
            "should resume a paused election",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                await voting.pauseElection(1);


                await expect(
                    voting.resumeElection(1)
                ).to.emit(
                    voting,
                    "ElectionResumed"
                );


                const election =
                    await voting.getElection(1);


                expect(election.status)
                    .to.equal(2);
            }
        );


        it(
            "should reject resuming an election that is not paused",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                await expect(
                    voting.resumeElection(1)
                ).to.be.revertedWith(
                    "Election not paused"
                );
            }
        );

    });


    // ============================================================
    // END ELECTION
    // ============================================================

    describe("End Election", function () {

        it(
            "should not end an election before its end time",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                await expect(
                    voting.endElection(1)
                ).to.be.revertedWith(
                    "Election still running"
                );
            }
        );


        it(
            "should end an election after its end time",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                await makeElectionEnded(
                    voting
                );


                const election =
                    await voting.getElection(1);


                expect(election.status)
                    .to.equal(4);
            }
        );

    });


    // ============================================================
    // FINALIZE ELECTION
    // ============================================================

    describe("Finalize Election", function () {

        it(
            "should move an ended election to FINALIZING",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                await makeElectionEnded(
                    voting
                );


                await expect(
                    voting.finalizeElection(1)
                ).to.emit(
                    voting,
                    "ElectionFinalizing"
                );


                const election =
                    await voting.getElection(1);


                expect(election.status)
                    .to.equal(5);
            }
        );


        it(
            "should reject finalization before election ends",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                await expect(
                    voting.finalizeElection(1)
                ).to.be.revertedWith(
                    "Election not ended"
                );
            }
        );

    });


    // ============================================================
    // PUBLISH ELECTION
    // ============================================================

    describe("Publish Election", function () {

        it(
            "should publish a finalized election",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                await makeElectionEnded(
                    voting
                );


                await voting.finalizeElection(1);


                await expect(
                    voting.publishElection(1)
                ).to.emit(
                    voting,
                    "ElectionPublished"
                );


                const election =
                    await voting.getElection(1);


                expect(election.status)
                    .to.equal(6);
            }
        );


        it(
            "should reject publishing an election that is not finalizing",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await expect(
                    voting.publishElection(1)
                ).to.be.revertedWith(
                    "Election not finalizing"
                );
            }
        );

    });


    // ============================================================
    // CANCEL ELECTION
    // ============================================================

    describe("Cancel Election", function () {

        it(
            "should cancel an active election",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                await expect(
                    voting.cancelElection(1)
                ).to.emit(
                    voting,
                    "ElectionCancelled"
                );


                const election =
                    await voting.getElection(1);


                expect(election.status)
                    .to.equal(7);
            }
        );


        it(
            "should reject cancelling a non-active election",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await expect(
                    voting.cancelElection(1)
                ).to.be.revertedWith(
                    "Election not active"
                );
            }
        );

    });


    // ============================================================
    // COMPROMISE ELECTION
    // ============================================================

    describe("Compromise Election", function () {

        it(
            "should mark an active election as COMPROMISED",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                await expect(
                    voting.compromiseElection(1)
                ).to.emit(
                    voting,
                    "ElectionCompromised"
                );


                const election =
                    await voting.getElection(1);


                expect(election.status)
                    .to.equal(8);
            }
        );


        it(
            "should reject compromising a non-active election",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await expect(
                    voting.compromiseElection(1)
                ).to.be.revertedWith(
                    "Election not active"
                );
            }
        );

    });


    // ============================================================
    // INVALIDATE ELECTION
    // ============================================================

    describe("Invalidate Election", function () {

        it(
            "should invalidate a compromised election",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                await voting.compromiseElection(1);


                await expect(
                    voting.invalidateElection(1)
                ).to.emit(
                    voting,
                    "ElectionInvalidated"
                );


                const election =
                    await voting.getElection(1);


                expect(election.status)
                    .to.equal(9);
            }
        );


        it(
            "should reject invalidating an election that is not compromised",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await expect(
                    voting.invalidateElection(1)
                ).to.be.revertedWith(
                    "Election not compromised"
                );
            }
        );

    });


    // ============================================================
    // INVALID STATE TRANSITIONS
    // ============================================================

    describe("Invalid State Transitions", function () {

        it(
            "should not resume a cancelled election",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                await voting.cancelElection(1);


                await expect(
                    voting.resumeElection(1)
                ).to.be.revertedWith(
                    "Election not paused"
                );
            }
        );


        it(
            "should not publish a cancelled election",
            async function () {

                const { voting } =
                    await deployVoting();


                await createScheduledElection(
                    voting
                );


                await makeElectionActive(
                    voting
                );


                await voting.cancelElection(1);


                await expect(
                    voting.publishElection(1)
                ).to.be.revertedWith(
                    "Election not finalizing"
                );
            }
        );

    });


    // ============================================================
    // NON-OWNER MANAGEMENT
    // ============================================================

    describe("Non-Owner Management", function () {

        it(
            "should reject non-owner election management",
            async function () {

                const {
                    voting,
                    otherAccount
                } = await deployVoting();


                await createScheduledElection(
                    voting
                );


                await expect(
                    voting
                        .connect(otherAccount)
                        .startElection(1)
                ).to.be.revertedWith(
                    "Only owner"
                );


                await expect(
                    voting
                        .connect(otherAccount)
                        .pauseElection(1)
                ).to.be.revertedWith(
                    "Only owner"
                );


                await expect(
                    voting
                        .connect(otherAccount)
                        .cancelElection(1)
                ).to.be.revertedWith(
                    "Only owner"
                );


                await expect(
                    voting
                        .connect(otherAccount)
                        .compromiseElection(1)
                ).to.be.revertedWith(
                    "Only owner"
                );

            }
        );

    });

});