import { expect } from "chai";
import { network } from "hardhat";

let ethers: any;

describe("Phase 6 - Security & Incident Management", function () {

    let owner: any;
    let admin: any;
    let nonAdmin: any;
    let voting: any;

    before(async function () {
        const connection = await network.connect();
        ethers = connection.ethers;
    });

    beforeEach(async function () {

        [owner, admin, nonAdmin] =
            await ethers.getSigners();

        const CollegeVoting =
            await ethers.getContractFactory(
                "CollegeVoting"
            );

        voting =
            await CollegeVoting.deploy();

        await voting.waitForDeployment();
    });


    async function createElection() {

        const latestBlock =
            await ethers.provider.getBlock(
                "latest"
            );

        const now =
            latestBlock.timestamp;

        await voting.createElection(
            "Security Test Election",
            0,
            now + 100,
            now + 1000,
            0
        );
    }


    it("should report a security incident", async function () {

        await createElection();

        const incidentType =
            ethers.keccak256(
                ethers.toUtf8Bytes(
                    "UNAUTHORIZED_ACCESS"
                )
            );

        const descriptionHash =
            ethers.keccak256(
                ethers.toUtf8Bytes(
                    "Suspicious administrative activity"
                )
            );

        const evidenceHash =
            ethers.keccak256(
                ethers.toUtf8Bytes(
                    "security-evidence-001"
                )
            );

        await expect(
            voting.reportSecurityIncident(
                1,
                2,
                incidentType,
                descriptionHash,
                evidenceHash
            )
        ).to.emit(
            voting,
            "SecurityIncidentReported"
        );
    });


    it("should store incident details correctly", async function () {

        await createElection();

        const incidentType =
            ethers.keccak256(
                ethers.toUtf8Bytes(
                    "TAMPER_DETECTED"
                )
            );

        const descriptionHash =
            ethers.keccak256(
                ethers.toUtf8Bytes(
                    "Election data tampering detected"
                )
            );

        const evidenceHash =
            ethers.keccak256(
                ethers.toUtf8Bytes(
                    "evidence-123"
                )
            );

        await voting.reportSecurityIncident(
            1,
            3,
            incidentType,
            descriptionHash,
            evidenceHash
        );

        const incident =
            await voting.getSecurityIncident(1);

        expect(incident.id).to.equal(1);
        expect(incident.electionId).to.equal(1);
        expect(incident.severity).to.equal(3);
        expect(incident.incidentType)
            .to.equal(incidentType);
        expect(incident.descriptionHash)
            .to.equal(descriptionHash);
        expect(incident.evidenceHash)
            .to.equal(evidenceHash);
        expect(incident.reportedBy)
            .to.equal(owner.address);
        expect(incident.timestamp)
            .to.be.greaterThan(0);
    });


    it("should support all security severity levels", async function () {

        await createElection();

        const incidentType =
            ethers.keccak256(
                ethers.toUtf8Bytes("SECURITY_TEST")
            );

        const descriptionHash =
            ethers.keccak256(
                ethers.toUtf8Bytes("test")
            );

        const evidenceHash =
            ethers.keccak256(
                ethers.toUtf8Bytes("evidence")
            );

        await voting.reportSecurityIncident(
            1,
            0,
            incidentType,
            descriptionHash,
            evidenceHash
        );

        await voting.reportSecurityIncident(
            1,
            1,
            incidentType,
            descriptionHash,
            evidenceHash
        );

        await voting.reportSecurityIncident(
            1,
            2,
            incidentType,
            descriptionHash,
            evidenceHash
        );

        await voting.reportSecurityIncident(
            1,
            3,
            incidentType,
            descriptionHash,
            evidenceHash
        );

        expect(
            await voting.getSecurityIncidentCount()
        ).to.equal(4);
    });


    it("should reject an incident for a nonexistent election", async function () {

        const incidentType =
            ethers.keccak256(
                ethers.toUtf8Bytes("TEST")
            );

        const descriptionHash =
            ethers.keccak256(
                ethers.toUtf8Bytes("description")
            );

        await expect(
            voting.reportSecurityIncident(
                999,
                1,
                incidentType,
                descriptionHash,
                ethers.ZeroHash
            )
        ).to.be.revertedWith(
            "Election does not exist"
        );
    });


    it("should reject an empty incident type", async function () {

        await createElection();

        const descriptionHash =
            ethers.keccak256(
                ethers.toUtf8Bytes("description")
            );

        await expect(
            voting.reportSecurityIncident(
                1,
                1,
                ethers.ZeroHash,
                descriptionHash,
                ethers.ZeroHash
            )
        ).to.be.revertedWith(
            "Incident type required"
        );
    });


    it("should reject an empty description hash", async function () {

        await createElection();

        const incidentType =
            ethers.keccak256(
                ethers.toUtf8Bytes("TEST")
            );

        await expect(
            voting.reportSecurityIncident(
                1,
                1,
                incidentType,
                ethers.ZeroHash,
                ethers.ZeroHash
            )
        ).to.be.revertedWith(
            "Description hash required"
        );
    });


    it("should allow an admin to report a security incident", async function () {

        await voting.addAdmin(
            admin.address
        );

        await createElection();

        const incidentType =
            ethers.keccak256(
                ethers.toUtf8Bytes(
                    "SUSPICIOUS_ACTIVITY"
                )
            );

        const descriptionHash =
            ethers.keccak256(
                ethers.toUtf8Bytes(
                    "Suspicious activity"
                )
            );

        await expect(
            voting.connect(admin)
                .reportSecurityIncident(
                    1,
                    2,
                    incidentType,
                    descriptionHash,
                    ethers.ZeroHash
                )
        ).to.emit(
            voting,
            "SecurityIncidentReported"
        );
    });


    it("should reject incident reporting by a non-admin", async function () {

        await createElection();

        const incidentType =
            ethers.keccak256(
                ethers.toUtf8Bytes("ATTACK")
            );

        const descriptionHash =
            ethers.keccak256(
                ethers.toUtf8Bytes("Attack")
            );

        await expect(
            voting.connect(nonAdmin)
                .reportSecurityIncident(
                    1,
                    3,
                    incidentType,
                    descriptionHash,
                    ethers.ZeroHash
                )
        ).to.be.revertedWith(
            "Only owner"
        );
    });


    it("should return total security incident count", async function () {

        await createElection();

        const incidentType =
            ethers.keccak256(
                ethers.toUtf8Bytes("TEST")
            );

        const descriptionHash =
            ethers.keccak256(
                ethers.toUtf8Bytes("Test")
            );

        await voting.reportSecurityIncident(
            1,
            0,
            incidentType,
            descriptionHash,
            ethers.ZeroHash
        );

        await voting.reportSecurityIncident(
            1,
            1,
            incidentType,
            descriptionHash,
            ethers.ZeroHash
        );

        expect(
            await voting.getSecurityIncidentCount()
        ).to.equal(2);
    });


    it("should track incidents separately for each election", async function () {

        const latestBlock =
            await ethers.provider.getBlock(
                "latest"
            );

        const now =
            latestBlock.timestamp;

        await voting.createElection(
            "Election One",
            0,
            now + 100,
            now + 1000,
            0
        );

        await voting.createElection(
            "Election Two",
            0,
            now + 200,
            now + 1200,
            0
        );

        const incidentType =
            ethers.keccak256(
                ethers.toUtf8Bytes("TEST")
            );

        const descriptionHash =
            ethers.keccak256(
                ethers.toUtf8Bytes("Test")
            );

        await voting.reportSecurityIncident(
            1,
            2,
            incidentType,
            descriptionHash,
            ethers.ZeroHash
        );

        await voting.reportSecurityIncident(
            2,
            3,
            incidentType,
            descriptionHash,
            ethers.ZeroHash
        );

        expect(
            await voting.getElectionSecurityIncidentCount(1)
        ).to.equal(1);

        expect(
            await voting.getElectionSecurityIncidentCount(2)
        ).to.equal(1);

        expect(
            await voting.getElectionSecurityIncidentId(
                1,
                0
            )
        ).to.equal(1);

        expect(
            await voting.getElectionSecurityIncidentId(
                2,
                0
            )
        ).to.equal(2);
    });


    it("should reject invalid incident index", async function () {

        await createElection();

        await expect(
            voting.getElectionSecurityIncidentId(
                1,
                0
            )
        ).to.be.revertedWith(
            "Incident index out of bounds"
        );
    });


    it("should preserve compromise functionality", async function () {

        await createElection();

        await voting.scheduleElection(1);

        const latestBlock =
            await ethers.provider.getBlock(
                "latest"
            );

        const currentTime =
            BigInt(latestBlock.timestamp);

        const election =
            await voting.getElection(1);

        const startTime =
            election.startTime;

        await ethers.provider.send(
            "evm_increaseTime",
            [
                Number(
                    startTime -
                    currentTime
                )
            ]
        );

        await ethers.provider.send(
            "evm_mine",
            []
        );

        await voting.startElection(1);

        await voting.compromiseElection(1);

        const updated =
            await voting.getElection(1);

        expect(updated.status).to.equal(8);
    });


    it("should preserve invalidation functionality", async function () {

        await createElection();

        await voting.scheduleElection(1);

        const latestBlock =
            await ethers.provider.getBlock(
                "latest"
            );

        const currentTime =
            BigInt(latestBlock.timestamp);

        const election =
            await voting.getElection(1);

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

        await voting.startElection(1);

        await voting.compromiseElection(1);

        await voting.invalidateElection(1);

        const updated =
            await voting.getElection(1);

        expect(updated.status).to.equal(9);
    });

});