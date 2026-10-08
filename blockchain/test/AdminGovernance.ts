import { expect } from "chai";
import { network } from "hardhat";

let ethers: any;

describe("Phase 5 - Admin Governance", function () {

    let owner: any;
    let admin: any;
    let admin2: any;
    let nonAdmin: any;
    let voting: any;

    before(async function () {
        const connection = await network.connect();
        ethers = connection.ethers;
    });

    beforeEach(async function () {

        [owner, admin, admin2, nonAdmin] =
            await ethers.getSigners();

        const CollegeVoting =
            await ethers.getContractFactory(
                "CollegeVoting"
            );

        voting =
            await CollegeVoting.deploy();

        await voting.waitForDeployment();
    });

    it("owner should be recognized as admin", async function () {

        expect(
            await voting.isAdmin(owner.address)
        ).to.equal(true);
    });

    it("should add an election admin", async function () {

        await expect(
            voting.addAdmin(admin.address)
        )
            .to.emit(voting, "AdminAdded")
            .withArgs(admin.address);

        expect(
            await voting.isAdmin(admin.address)
        ).to.equal(true);
    });

    it("should reject duplicate admin", async function () {

        await voting.addAdmin(admin.address);

        await expect(
            voting.addAdmin(admin.address)
        ).to.be.revertedWith(
            "Admin already exists"
        );
    });

    it("should reject zero address admin", async function () {

        await expect(
            voting.addAdmin(ethers.ZeroAddress)
        ).to.be.revertedWith(
            "Invalid admin address"
        );
    });

    it("non-owner cannot add admin", async function () {

        await expect(
            voting.connect(nonAdmin)
                .addAdmin(admin.address)
        ).to.be.revertedWith(
            "Only owner"
        );
    });

    it("should remove admin", async function () {

        await voting.addAdmin(admin.address);

        await expect(
            voting.removeAdmin(admin.address)
        )
            .to.emit(voting, "AdminRemoved")
            .withArgs(admin.address);

        expect(
            await voting.isAdmin(admin.address)
        ).to.equal(false);
    });

    it("removed admin cannot manage elections", async function () {

        await voting.addAdmin(admin.address);
        await voting.removeAdmin(admin.address);

        const now =
            (await ethers.provider.getBlock("latest"))
                .timestamp;

        await expect(
            voting.connect(admin).createElection(
                "Test Election",
                0,
                now + 100,
                now + 1000,
                0
            )
        ).to.be.revertedWith(
            "Only owner"
        );
    });

    it("admin should be able to create election", async function () {

        await voting.addAdmin(admin.address);

        const now =
            (await ethers.provider.getBlock("latest"))
                .timestamp;

        await expect(
            voting.connect(admin).createElection(
                "Admin Election",
                0,
                now + 100,
                now + 1000,
                0
            )
        ).to.emit(
            voting,
            "ElectionCreated"
        );
    });

    it("admin should be able to add candidate", async function () {

        await voting.addAdmin(admin.address);

        const now =
            (await ethers.provider.getBlock("latest"))
                .timestamp;

        await voting.createElection(
            "Candidate Election",
            0,
            now + 100,
            now + 1000,
            0
        );

        const identityHash =
            ethers.keccak256(
                ethers.toUtf8Bytes("candidate-1")
            );

        await expect(
            voting.connect(admin).addCandidate(
                1,
                identityHash,
                ethers.keccak256(
                    ethers.toUtf8Bytes("candidate-data")
                )
            )
        ).to.emit(
            voting,
            "CandidateAdded"
        );
    });

    it("admin should be able to register voter", async function () {

        await voting.addAdmin(admin.address);

        const now =
            (await ethers.provider.getBlock("latest"))
                .timestamp;

        await voting.createElection(
            "Voter Election",
            0,
            now + 100,
            now + 1000,
            0
        );

        const voterHash =
            ethers.keccak256(
                ethers.toUtf8Bytes("student-1")
            );

        await expect(
            voting.connect(admin).registerVoter(
                1,
                voterHash
            )
        ).to.emit(
            voting,
            "VoterRegistered"
        );
    });

    it("admin should be able to schedule election", async function () {

        await voting.addAdmin(admin.address);

        const now =
            (await ethers.provider.getBlock("latest"))
                .timestamp;

        await voting.createElection(
            "Schedule Election",
            0,
            now + 100,
            now + 1000,
            0
        );

        await expect(
            voting.connect(admin)
                .scheduleElection(1)
        ).to.emit(
            voting,
            "ElectionScheduled"
        );
    });

    it("should return admin count", async function () {

        await voting.addAdmin(admin.address);
        await voting.addAdmin(admin2.address);

        expect(
            await voting.getAdminCount()
        ).to.equal(2);
    });

    it("should return admin address by index", async function () {

        await voting.addAdmin(admin.address);
        await voting.addAdmin(admin2.address);

        expect(
            await voting.getAdminAt(0)
        ).to.equal(admin.address);

        expect(
            await voting.getAdminAt(1)
        ).to.equal(admin2.address);
    });

    it("owner remains the super admin", async function () {

        expect(
            await voting.isAdmin(owner.address)
        ).to.equal(true);

        await expect(
            voting.removeAdmin(owner.address)
        ).to.be.revertedWith(
            "Admin does not exist"
        );
    });

});