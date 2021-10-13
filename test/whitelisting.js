const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crypto Manga whitelisting", () => {
  let CryptoManga, cryptoManga;
  let MockLoot, mockCyberLoot, mockLoot, mockMetaverseTicket;
  let owner,
    addr1,
    addr2,
    multiSigAddress,
    whitelistSignerTierOne,
    whitelistSignerTierTwo;
  const ipfsBaseURI = "ipfs://xyz/";

  // nice try these are useless local hardhat pks ;)  
  const tierOnePrivateKey =
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a";
  const tierTwoPrivateKey =
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba";
  beforeEach(async () => {
    CryptoManga = await ethers.getContractFactory("CryptoManga");
    MockLoot = await ethers.getContractFactory("MockLoot");

    [
      owner,
      addr1,
      addr2,
      multiSigAddress,
      whitelistSignerTierOne,
      whitelistSignerTierTwo,
    ] = await ethers.getSigners();

    mockLoot = await MockLoot.deploy(ipfsBaseURI);
    mockCyberLoot = await MockLoot.deploy(ipfsBaseURI);
    mockMetaverseTicket = await MockLoot.deploy(ipfsBaseURI);

    cryptoManga = await CryptoManga.deploy(
      ipfsBaseURI,
      mockCyberLoot.address,
      mockLoot.address,
      mockMetaverseTicket.address,
      multiSigAddress.address,
      whitelistSignerTierOne.address,
      whitelistSignerTierTwo.address
    );
  });

  const createSignature = (recipient, privateKey) => {
    params = { recipient: recipient.address, amount: 1 };
    const message = web3.utils
      .soliditySha3(
        { t: "address", v: params.recipient },
        { t: "uint256", v: params.amount }
      )
      .toString("hex");

    const { signature } = web3.eth.accounts.sign(message, privateKey);
    return { signature };
  };

  it("Should give discounts to tier one whitelisted accounts", async () => {
    await cryptoManga.connect(owner).pause(false);

    const { signature } = createSignature(addr1, tierOnePrivateKey);

    await cryptoManga
      .connect(addr1)
      .mintWithTierOneDiscount(addr1.address, 1, signature, {
        value: ethers.utils.parseEther("0.065"),
      });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(1);
  });

  it("Should not give discounts to non whitelisted accounts", async () => {
    // failure when addr1 provides signature that was obtained for addr2
    await cryptoManga.connect(owner).pause(false);

    const { signature } = createSignature(addr2, tierOnePrivateKey);

    try {
      await cryptoManga
        .connect(addr1)
        .mintWithTierOneDiscount(addr1.address, 1, signature, {
          value: ethers.utils.parseEther("0.065"),
        });
    } catch (err) {
      expect(err.message).to.equal(
        "VM Exception while processing transaction: reverted with reason string 'Wrong signature'"
      );
    }
  });

  it("should be able to mint multiple tokens with tier one discount in one transaction", async () => {
    await cryptoManga.connect(owner).pause(false);
    const { signature } = createSignature(addr1, tierOnePrivateKey);
    await cryptoManga
      .connect(addr1)
      .mintWithTierOneDiscount(addr1.address, 5, signature, {
        value: ethers.utils.parseEther("0.325"),
      });
    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(5);
  });

  it("should not be able to get a discount multiple times with same signature", async () => {
    await cryptoManga.connect(owner).pause(false);

    const { signature } = createSignature(addr1, tierOnePrivateKey);
    await cryptoManga
      .connect(addr1)
      .mintWithTierOneDiscount(addr1.address, 1, signature, {
        value: ethers.utils.parseEther("0.065"),
      });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(1);

    try {
      await cryptoManga
        .connect(addr1)
        .mintWithTierOneDiscount(addr1.address, 1, signature, {
          value: ethers.utils.parseEther("0.065"),
        });
    } catch (err) {
      expect(err.message).to.equal(
        "VM Exception while processing transaction: reverted with reason string 'Discount already claimed'"
      );
    }
  });

  it("should not be able to get tier one discount with tier two signature", async () => {
    await cryptoManga.connect(owner).pause(false);

    const { signature } = createSignature(addr1, tierTwoPrivateKey);

    try {
      await cryptoManga
        .connect(addr1)
        .mintWithTierOneDiscount(addr1.address, 1, signature, {
          value: ethers.utils.parseEther("0.065"),
        });
    } catch (err) {
      expect(err.message).to.equal(
        "VM Exception while processing transaction: reverted with reason string 'Wrong signature'"
      );
    }
  });

  it("should be able to get tier two discount", async () => {
    await cryptoManga.connect(owner).pause(false);

    const { signature } = createSignature(addr1, tierTwoPrivateKey);

    await cryptoManga
      .connect(addr1)
      .mintWithTierTwoDiscount(addr1.address, 1, signature, {
        value: ethers.utils.parseEther("0.07"),
      });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(1);
  });

  it("should be able to change whitelist signer", async () => {
    await cryptoManga.connect(owner).pause(false);

    await cryptoManga
      .connect(owner)
      .setWhitelistSignerTierOne(whitelistSignerTierTwo.address);

    const { signature } = createSignature(addr1, tierTwoPrivateKey);
    await cryptoManga
      .connect(addr1)
      .mintWithTierOneDiscount(addr1.address, 1, signature, {
        value: ethers.utils.parseEther("0.065"),
      });

    expect(await cryptoManga.balanceOf(addr1.address)).to.equal(1);
  });
});
