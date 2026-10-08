import { expect } from "chai";
import { network } from "hardhat";

describe("CollegeVoting - Candidate Management", function () {

    let ethers: any;

    before(async function () {
        const connection = await network.connect();
        ethers = connection.ethers;
    });


    async function deployVoting() {

        const [owner, otherAccount] =
            await ethers.getSigners();

        const voting =
            await ethers.deployContract(
                "CollegeVoting"
            );

        await voting.waitForDeployment();

        return {
            voting,
            owner,
            otherAccount
        };
    }


    async function createScheduledElection(
        voting: any
    ) {

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
            BigInt(latestBlock.timestamp);

        const startTime =
            currentTime + 3600n;

        const endTime =
            currentTime + 7200n;


        await voting.createElection(
            "Student Council Election",
            2,
            startTime,
            endTime,
            500
        );


        await voting.scheduleElection(1);
    }


    async function makeElectionActive(
        voting: any
    ) {

        const election =
            await voting.getElection(1);

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
            BigInt(latestBlock.timestamp);


        if (currentTime < election.startTime) {

            await ethers.provider.send(
                "evm_increaseTime",
                [
                    Number(
                        election.startTime -
                        currentTime
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
    // ADD CANDIDATE
    // ============================================================

    it(
        "should add a candidate",
        async function () {

            const { voting } =
                await deployVoting();


            await createScheduledElection(
                voting
            );


            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "STUDENT-001"
                    )
                );


            const metadataHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "CANDIDATE-METADATA-001"
                    )
                );


            await expect(
                voting.addCandidate(
                    1,
                    identityHash,
                    metadataHash
                )
            ).to.emit(
                voting,
                "CandidateAdded"
            );


            const candidate =
                await voting.getCandidate(
                    1,
                    1
                );


            expect(candidate.id)
                .to.equal(1n);


            expect(candidate.identityHash)
                .to.equal(identityHash);


            expect(candidate.metadataHash)
                .to.equal(metadataHash);


            expect(candidate.status)
                .to.equal(0);


            expect(candidate.voteCount)
                .to.equal(0n);
        }
    );


    // ============================================================
    // ADD MULTIPLE CANDIDATES
    // ============================================================

    it(
        "should add multiple candidates to one election",
        async function () {

            const { voting } =
                await deployVoting();


            await createScheduledElection(
                voting
            );


            const identityHash1 =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "STUDENT-001"
                    )
                );


            const identityHash2 =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "STUDENT-002"
                    )
                );


            const metadataHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "METADATA"
                    )
                );


            await voting.addCandidate(
                1,
                identityHash1,
                metadataHash
            );


            await voting.addCandidate(
                1,
                identityHash2,
                metadataHash
            );


            expect(
                await voting.getCandidateCount(1)
            ).to.equal(2n);


            const ids =
                await voting.getCandidateIds(1);


            expect(ids.length)
                .to.equal(2);


            expect(ids[0])
                .to.equal(1n);


            expect(ids[1])
                .to.equal(2n);
        }
    );


    // ============================================================
    // DUPLICATE CANDIDATE
    // ============================================================

    it(
        "should reject a duplicate candidate identity",
        async function () {

            const { voting } =
                await deployVoting();


            await createScheduledElection(
                voting
            );


            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "STUDENT-001"
                    )
                );


            const metadataHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "METADATA"
                    )
                );


            await voting.addCandidate(
                1,
                identityHash,
                metadataHash
            );


            await expect(
                voting.addCandidate(
                    1,
                    identityHash,
                    metadataHash
                )
            ).to.be.revertedWith(
                "Candidate already exists"
            );
        }
    );


    // ============================================================
    // EMPTY IDENTITY HASH
    // ============================================================

    it(
        "should reject an empty candidate identity hash",
        async function () {

            const { voting } =
                await deployVoting();


            await createScheduledElection(
                voting
            );


            const metadataHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "METADATA"
                    )
                );


            await expect(
                voting.addCandidate(
                    1,
                    ethers.ZeroHash,
                    metadataHash
                )
            ).to.be.revertedWith(
                "Identity hash required"
            );
        }
    );


    // ============================================================
    // UPDATE CANDIDATE
    // ============================================================

    it(
        "should update candidate metadata before election starts",
        async function () {

            const { voting } =
                await deployVoting();


            await createScheduledElection(
                voting
            );


            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "STUDENT-001"
                    )
                );


            const metadataHash1 =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "METADATA-1"
                    )
                );


            const metadataHash2 =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "METADATA-2"
                    )
                );


            await voting.addCandidate(
                1,
                identityHash,
                metadataHash1
            );


            await expect(
                voting.updateCandidate(
                    1,
                    1,
                    metadataHash2
                )
            ).to.emit(
                voting,
                "CandidateUpdated"
            );


            const candidate =
                await voting.getCandidate(
                    1,
                    1
                );


            expect(candidate.metadataHash)
                .to.equal(metadataHash2);
        }
    );


    // ============================================================
    // REMOVE CANDIDATE
    // ============================================================

    it(
        "should remove a candidate before election starts",
        async function () {

            const { voting } =
                await deployVoting();


            await createScheduledElection(
                voting
            );


            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "STUDENT-001"
                    )
                );


            const metadataHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "METADATA"
                    )
                );


            await voting.addCandidate(
                1,
                identityHash,
                metadataHash
            );


            await expect(
                voting.removeCandidate(
                    1,
                    1
                )
            ).to.emit(
                voting,
                "CandidateRemoved"
            );


            const candidate =
                await voting.getCandidate(
                    1,
                    1
                );


            expect(candidate.status)
                .to.equal(1);
        }
    );


    // ============================================================
    // CANDIDATE LOCK
    // ============================================================

    it(
        "should lock candidate addition after election starts",
        async function () {

            const { voting } =
                await deployVoting();


            await createScheduledElection(
                voting
            );


            await voting.addCandidate(
                1,
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "STUDENT-001"
                    )
                ),
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "METADATA-001"
                    )
                )
            );


            await makeElectionActive(
                voting
            );


            await expect(
                voting.addCandidate(
                    1,
                    ethers.keccak256(
                        ethers.toUtf8Bytes(
                            "STUDENT-002"
                        )
                    ),
                    ethers.keccak256(
                        ethers.toUtf8Bytes(
                            "METADATA-002"
                        )
                    )
                )
            ).to.be.revertedWith(
                "Candidate list locked"
            );
        }
    );


    // ============================================================
    // UPDATE LOCK
    // ============================================================

    it(
        "should lock candidate updates after election starts",
        async function () {

            const { voting } =
                await deployVoting();


            await createScheduledElection(
                voting
            );


            await voting.addCandidate(
                1,
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "STUDENT-001"
                    )
                ),
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "METADATA-001"
                    )
                )
            );


            await makeElectionActive(
                voting
            );


            await expect(
                voting.updateCandidate(
                    1,
                    1,
                    ethers.keccak256(
                        ethers.toUtf8Bytes(
                            "NEW-METADATA"
                        )
                    )
                )
            ).to.be.revertedWith(
                "Candidate list locked"
            );
        }
    );


    // ============================================================
    // REMOVE LOCK
    // ============================================================

    it(
        "should prevent removing a candidate after election starts",
        async function () {

            const { voting } =
                await deployVoting();


            await createScheduledElection(
                voting
            );


            await voting.addCandidate(
                1,
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "STUDENT-001"
                    )
                ),
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "METADATA-001"
                    )
                )
            );


            await makeElectionActive(
                voting
            );


            await expect(
                voting.removeCandidate(
                    1,
                    1
                )
            ).to.be.revertedWith(
                "Candidate list locked"
            );
        }
    );


    // ============================================================
    // WITHDRAW AFTER START
    // ============================================================

    it(
        "should allow formal candidate withdrawal after election starts",
        async function () {

            const { voting } =
                await deployVoting();


            await createScheduledElection(
                voting
            );


            await voting.addCandidate(
                1,
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "STUDENT-001"
                    )
                ),
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "METADATA-001"
                    )
                )
            );


            await makeElectionActive(
                voting
            );


            await expect(
                voting.withdrawCandidate(
                    1,
                    1
                )
            ).to.emit(
                voting,
                "CandidateWithdrawn"
            );


            const candidate =
                await voting.getCandidate(
                    1,
                    1
                );


            expect(candidate.status)
                .to.equal(2);
        }
    );


    // ============================================================
    // NON-OWNER
    // ============================================================

    it(
        "should reject candidate management by a non-owner",
        async function () {

            const {
                voting,
                otherAccount
            } = await deployVoting();


            await createScheduledElection(
                voting
            );


            const identityHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "STUDENT-001"
                    )
                );


            const metadataHash =
                ethers.keccak256(
                    ethers.toUtf8Bytes(
                        "METADATA"
                    )
                );


            await expect(
                voting
                    .connect(otherAccount)
                    .addCandidate(
                        1,
                        identityHash,
                        metadataHash
                    )
            ).to.be.revertedWith(
                "Only owner"
            );
        }
    );

});