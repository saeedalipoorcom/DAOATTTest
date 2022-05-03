// const { expect } = require("chai");
const { ethers } = require("hardhat");

/*

    const DeleteTXOwner = await GOVTokenContract.delegate(owner.address);
    await DeleteTXOwner.wait(1);
    console.log(
      "OwnerPower : ",
      await GOVTokenContract.numCheckpoints(owner.address)
    );

    with this code we delegate to user and user can vote ! but if we delegte before and after create proposal , results are different.
    test it and move this code before and after and see results.
*/

describe("DAO", function () {
  it("Start", async function () {
    const [owner] = await ethers.getSigners();

    /// /////////////////////////////////////////////////////////////////////////////// DEPLOY MAIN CONTRACT
    const Age = await ethers.getContractFactory("Age");
    const AgeContract = await Age.deploy();
    await AgeContract.deployed();
    console.log("AgeContract deployed to:", AgeContract.address);

    console.log("First value :", (await AgeContract.getAge()).toString());

    /// /////////////////////////////////////////////////////////////////////////////// DEPLOY MAIN GOV TOKEN
    const GOVToken = await ethers.getContractFactory("GOVToken");
    const GOVTokenContract = await GOVToken.deploy();
    await GOVTokenContract.deployed();
    console.log("GOVTokenContract deployed to:", GOVTokenContract.address);

    // const DeleteTXOwner = await GOVTokenContract.delegate(owner.address);
    // await DeleteTXOwner.wait(1);
    // console.log(
    //   "OwnerPower : ",
    //   await GOVTokenContract.numCheckpoints(owner.address)
    // );

    /// /////////////////////////////////////////////////////////////////////////////// DEPLOY MAIN TIMELOCK TOKEN
    const TimeLock = await ethers.getContractFactory("TimeLock");
    const TimeLockContract = await TimeLock.deploy(3600, [], []);
    await TimeLockContract.deployed();
    console.log("TimeLockContract deployed to:", TimeLockContract.address);

    /// /////////////////////////////////////////////////////////////////////////////// DEPLOY MAIN GOV CONTRACT
    const GovernanceContract = await ethers.getContractFactory(
      "GovernanceContract"
    );
    const GovernanceContractC = await GovernanceContract.deploy(
      GOVTokenContract.address,
      TimeLockContract.address
    );
    await GovernanceContractC.deployed();
    console.log(
      "GovernanceContractC deployed to:",
      GovernanceContractC.address
    );

    /// /////////////////////////////////////////////////////////////////////////////// TRANSFER ROLES
    const PROPOSER_ROLE = await TimeLockContract.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await TimeLockContract.EXECUTOR_ROLE();
    const TIMELOCK_ADMIN_ROLE = await TimeLockContract.TIMELOCK_ADMIN_ROLE();

    //
    const PROPOSER_ROLETX = await TimeLockContract.grantRole(
      PROPOSER_ROLE,
      GovernanceContractC.address
    );
    await PROPOSER_ROLETX.wait(1);

    //
    const EXECUTOR_ROLETX = await TimeLockContract.grantRole(
      EXECUTOR_ROLE,
      "0x0000000000000000000000000000000000000000"
    );
    await EXECUTOR_ROLETX.wait(1);

    //
    const TIMELOCK_ADMIN_ROLETX = await TimeLockContract.grantRole(
      TIMELOCK_ADMIN_ROLE,
      owner.address
    );
    await TIMELOCK_ADMIN_ROLETX.wait(1);

    /// /////////////////////////////////////////////////////////////////////////////// TRANSFER MAIN CONTRACT OWNERSHIP TO TIMELOCK
    const transferOwnershipTX = await AgeContract.transferOwnership(
      TimeLockContract.address
    );
    await transferOwnershipTX.wait();

    /// /////////////////////////////////////////////////////////////////////////////// CREATE PROPOSE BY GOV CONTRACT

    const encodeFunctionCall = AgeContract.interface.encodeFunctionData(
      "setAge",
      [50]
    );

    const proposalDesc = "change age value from 0 to 50";

    const proposTX = await GovernanceContractC.propose(
      [AgeContract.address],
      [0],
      [encodeFunctionCall],
      proposalDesc
    );
    const proposeR = await proposTX.wait(1);

    for (let i = 0; i < 2; i++) {
      ethers.provider.send("evm_mine");
    }

    const DeleteTXOwner = await GOVTokenContract.delegate(owner.address);
    await DeleteTXOwner.wait(1);
    console.log(
      "OwnerPower : ",
      await GOVTokenContract.numCheckpoints(owner.address)
    );

    const proposalID = await proposeR.events[0].args.proposalId;

    /// /////////////////////////////////////////////////////////////////////////////// VOTE !

    const voteTXOwner = await GovernanceContractC.castVoteWithReason(
      proposalID,
      1,
      "I want"
    );
    await voteTXOwner.wait(1);

    for (let i = 0; i < 102; i++) {
      ethers.provider.send("evm_mine");
    }

    /// /////////////////////////////////////////////////////////////////////////////// FINISH IT !

    const DescHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(proposalDesc)
    );

    const QTX = await GovernanceContractC.queue(
      [AgeContract.address],
      [0],
      [encodeFunctionCall],
      DescHash
    );
    await QTX.wait(1);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    const EXTX = await GovernanceContractC.execute(
      [AgeContract.address],
      [0],
      [encodeFunctionCall],
      DescHash
    );
    await EXTX.wait(1);

    console.log("Final value :", (await AgeContract.getAge()).toString());
  });
});
