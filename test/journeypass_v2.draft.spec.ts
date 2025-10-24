/**
 * JourneyPass v2 テスト雛形（DRAFT）
 *
 * ⚠️ このファイルはdescribe.skipで無効化されています ⚠️
 *
 * 目的：
 * - v2の期待仕様を雛形として記述
 * - 本番デプロイ時にskipを外してテスト実行
 * - CI影響を回避（現時点では実行しない）
 */

import { expect } from 'chai';
// import { ethers } from 'hardhat';
// import { JourneyPassV2 } from '../typechain-types';
// import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe.skip('JourneyPass v2 (DRAFT - TESTS DISABLED)', () => {
  // let journeyPass: JourneyPassV2;
  // let owner: SignerWithAddress;
  // let flagSetter: SignerWithAddress;
  // let user1: SignerWithAddress;
  // let user2: SignerWithAddress;

  // const NAMESPACE_STAMP_2024 = ethers.utils.keccak256(
  //   ethers.utils.toUtf8Bytes('StampRally2024')
  // );
  // const NAMESPACE_KYC = ethers.utils.keccak256(
  //   ethers.utils.toUtf8Bytes('KYCVerification')
  // );

  before(async () => {
    console.log('⚠️ JourneyPass v2 tests are skipped (draft implementation)');
  });

  describe('v1互換性', () => {
    it.skip('v1のmint()が正常に動作する', async () => {
      // const tokenId = await journeyPass.mint(user1.address);
      // expect(tokenId).to.equal(1);
    });

    it.skip('v1のsetFlag()が正常に動作する', async () => {
      // const tokenId = 1;
      // await journeyPass.connect(flagSetter).setFlag(
      //   tokenId,
      //   0,
      //   true,
      //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001'))
      // );
      // expect(await journeyPass.hasFlag(tokenId, 0)).to.be.true;
    });

    it.skip('v1のflagsOf()が正常に動作する', async () => {
      // const tokenId = 1;
      // const flags = await journeyPass.flagsOf(tokenId);
      // expect(flags).to.equal(1); // bit 0 is set
    });
  });

  describe('名前空間付きフラグ（v2）', () => {
    it.skip('setFlagNS()がFLAG_SETTER_ROLEで実行可能', async () => {
      // const tokenId = 1;
      // await journeyPass.connect(flagSetter).setFlagNS(
      //   tokenId,
      //   NAMESPACE_STAMP_2024,
      //   0,
      //   true,
      //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001')),
      //   ethers.constants.HashZero, // no evidence
      //   0 // permanent
      // );
      //
      // expect(await journeyPass.hasFlagNS(tokenId, NAMESPACE_STAMP_2024, 0)).to.be.true;
    });

    it.skip('setFlagNS()が権限なしで失敗する', async () => {
      // const tokenId = 1;
      // await expect(
      //   journeyPass.connect(user1).setFlagNS(
      //     tokenId,
      //     NAMESPACE_STAMP_2024,
      //     0,
      //     true,
      //     ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001')),
      //     ethers.constants.HashZero,
      //     0
      //   )
      // ).to.be.revertedWith('AccessControl');
    });

    it.skip('異なるnamespaceで独立したフラグを管理できる', async () => {
      // const tokenId = 1;
      //
      // // NAMESPACE_STAMP_2024のbit 0をセット
      // await journeyPass.connect(flagSetter).setFlagNS(
      //   tokenId,
      //   NAMESPACE_STAMP_2024,
      //   0,
      //   true,
      //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001')),
      //   ethers.constants.HashZero,
      //   0
      // );
      //
      // // NAMESPACE_KYCのbit 0をセット
      // await journeyPass.connect(flagSetter).setFlagNS(
      //   tokenId,
      //   NAMESPACE_KYC,
      //   0,
      //   true,
      //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-002')),
      //   ethers.constants.HashZero,
      //   0
      // );
      //
      // // 両方のnamespaceでbit 0がセットされている
      // expect(await journeyPass.hasFlagNS(tokenId, NAMESPACE_STAMP_2024, 0)).to.be.true;
      // expect(await journeyPass.hasFlagNS(tokenId, NAMESPACE_KYC, 0)).to.be.true;
    });
  });

  describe('有効期限（v2）', () => {
    it.skip('有効期限内のフラグはisFlagValidNSがtrueを返す', async () => {
      // const tokenId = 1;
      // const validUntil = Math.floor(Date.now() / 1000) + 3600; // 1時間後
      //
      // await journeyPass.connect(flagSetter).setFlagNS(
      //   tokenId,
      //   NAMESPACE_KYC,
      //   0,
      //   true,
      //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001')),
      //   ethers.constants.HashZero,
      //   validUntil
      // );
      //
      // expect(await journeyPass.isFlagValidNS(tokenId, NAMESPACE_KYC, 0)).to.be.true;
    });

    it.skip('期限切れのフラグはisFlagValidNSがfalseを返す', async () => {
      // const tokenId = 1;
      // const validUntil = Math.floor(Date.now() / 1000) - 1; // 1秒前（期限切れ）
      //
      // await journeyPass.connect(flagSetter).setFlagNS(
      //   tokenId,
      //   NAMESPACE_KYC,
      //   1,
      //   true,
      //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-002')),
      //   ethers.constants.HashZero,
      //   validUntil
      // );
      //
      // // hasFlagNSはtrueだが、isFlagValidNSはfalse
      // expect(await journeyPass.hasFlagNS(tokenId, NAMESPACE_KYC, 1)).to.be.true;
      // expect(await journeyPass.isFlagValidNS(tokenId, NAMESPACE_KYC, 1)).to.be.false;
      //
      // // 注意：実際のテストでは時間操作（hardhat network_helpers）が必要
      // // await time.increase(3600);
    });

    it.skip('validUntil=0の場合は永続的に有効', async () => {
      // const tokenId = 1;
      //
      // await journeyPass.connect(flagSetter).setFlagNS(
      //   tokenId,
      //   NAMESPACE_STAMP_2024,
      //   0,
      //   true,
      //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001')),
      //   ethers.constants.HashZero,
      //   0 // permanent
      // );
      //
      // expect(await journeyPass.isFlagValidNS(tokenId, NAMESPACE_STAMP_2024, 0)).to.be.true;
    });
  });

  describe('失効（v2）', () => {
    it.skip('revokeFlagNS()でフラグを失効できる', async () => {
      // const tokenId = 1;
      //
      // // フラグをセット
      // await journeyPass.connect(flagSetter).setFlagNS(
      //   tokenId,
      //   NAMESPACE_KYC,
      //   0,
      //   true,
      //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001')),
      //   ethers.constants.HashZero,
      //   0
      // );
      //
      // expect(await journeyPass.hasFlagNS(tokenId, NAMESPACE_KYC, 0)).to.be.true;
      //
      // // 失効
      // await journeyPass.connect(flagSetter).revokeFlagNS(
      //   tokenId,
      //   NAMESPACE_KYC,
      //   0,
      //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-revoke')),
      //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes('fraud-detected'))
      // );
      //
      // expect(await journeyPass.hasFlagNS(tokenId, NAMESPACE_KYC, 0)).to.be.false;
    });

    it.skip('FlagRevokedNSイベントが発火される', async () => {
      // const tokenId = 1;
      // const reasonHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('fraud-detected'));
      //
      // await journeyPass.connect(flagSetter).setFlagNS(
      //   tokenId,
      //   NAMESPACE_KYC,
      //   0,
      //   true,
      //   ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001')),
      //   ethers.constants.HashZero,
      //   0
      // );
      //
      // await expect(
      //   journeyPass.connect(flagSetter).revokeFlagNS(
      //     tokenId,
      //     NAMESPACE_KYC,
      //     0,
      //     ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-revoke')),
      //     reasonHash
      //   )
      // )
      //   .to.emit(journeyPass, 'FlagRevokedNS')
      //   .withArgs(
      //     NAMESPACE_KYC,
      //     tokenId,
      //     0,
      //     flagSetter.address,
      //     ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-revoke')),
      //     reasonHash
      //   );
    });
  });

  describe('EIP-712署名ベース更新（v2）', () => {
    it.skip('setFlagNSWithSig()が正しい署名で実行される', async () => {
      // const tokenId = 1;
      // const nonce = await journeyPass.nonces(user1.address);
      // const deadline = Math.floor(Date.now() / 1000) + 3600; // 1時間後
      //
      // const domain = {
      //   name: 'JourneyPassV2',
      //   version: '2',
      //   chainId: (await ethers.provider.getNetwork()).chainId,
      //   verifyingContract: journeyPass.address,
      // };
      //
      // const types = {
      //   SetFlagNS: [
      //     { name: 'tokenId', type: 'uint256' },
      //     { name: 'namespace', type: 'bytes32' },
      //     { name: 'bit', type: 'uint8' },
      //     { name: 'value', type: 'bool' },
      //     { name: 'traceId', type: 'bytes32' },
      //     { name: 'evidenceHash', type: 'bytes32' },
      //     { name: 'validUntil', type: 'uint64' },
      //     { name: 'nonce', type: 'uint256' },
      //     { name: 'deadline', type: 'uint256' },
      //   ],
      // };
      //
      // const value = {
      //   tokenId,
      //   namespace: NAMESPACE_STAMP_2024,
      //   bit: 0,
      //   value: true,
      //   traceId: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001')),
      //   evidenceHash: ethers.constants.HashZero,
      //   validUntil: 0,
      //   nonce,
      //   deadline,
      // };
      //
      // const signature = await user1._signTypedData(domain, types, value);
      // const { v, r, s } = ethers.utils.splitSignature(signature);
      //
      // await journeyPass.setFlagNSWithSig(
      //   tokenId,
      //   NAMESPACE_STAMP_2024,
      //   0,
      //   true,
      //   value.traceId,
      //   ethers.constants.HashZero,
      //   0,
      //   deadline,
      //   v,
      //   r,
      //   s
      // );
      //
      // expect(await journeyPass.hasFlagNS(tokenId, NAMESPACE_STAMP_2024, 0)).to.be.true;
    });

    it.skip('不正な署名で失敗する', async () => {
      // const tokenId = 1;
      // const deadline = Math.floor(Date.now() / 1000) + 3600;
      //
      // // user2の署名を使ってuser1のトークンを更新しようとする（失敗するはず）
      // const signature = await user2._signTypedData(/* ... */);
      // const { v, r, s } = ethers.utils.splitSignature(signature);
      //
      // await expect(
      //   journeyPass.setFlagNSWithSig(
      //     tokenId,
      //     NAMESPACE_STAMP_2024,
      //     0,
      //     true,
      //     ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001')),
      //     ethers.constants.HashZero,
      //     0,
      //     deadline,
      //     v,
      //     r,
      //     s
      //   )
      // ).to.be.revertedWith('Invalid signature');
    });

    it.skip('期限切れの署名で失敗する', async () => {
      // const tokenId = 1;
      // const deadline = Math.floor(Date.now() / 1000) - 1; // 1秒前（期限切れ）
      //
      // const signature = await user1._signTypedData(/* ... */);
      // const { v, r, s } = ethers.utils.splitSignature(signature);
      //
      // await expect(
      //   journeyPass.setFlagNSWithSig(
      //     tokenId,
      //     NAMESPACE_STAMP_2024,
      //     0,
      //     true,
      //     ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001')),
      //     ethers.constants.HashZero,
      //     0,
      //     deadline,
      //     v,
      //     r,
      //     s
      //   )
      // ).to.be.revertedWith('Signature expired');
    });

    it.skip('nonce が正しく進む', async () => {
      // const tokenId = 1;
      // const nonceBefore = await journeyPass.nonces(user1.address);
      //
      // // 署名実行
      // // ... (上記のsetFlagNSWithSigテストと同様)
      //
      // const nonceAfter = await journeyPass.nonces(user1.address);
      // expect(nonceAfter).to.equal(nonceBefore.add(1));
    });
  });

  describe('イベント（v2）', () => {
    it.skip('FlagUpdatedNSイベントが正しく発火される', async () => {
      // const tokenId = 1;
      // const evidenceHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('photo-001'));
      // const validUntil = Math.floor(Date.now() / 1000) + 3600;
      //
      // await expect(
      //   journeyPass.connect(flagSetter).setFlagNS(
      //     tokenId,
      //     NAMESPACE_KYC,
      //     0,
      //     true,
      //     ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001')),
      //     evidenceHash,
      //     validUntil
      //   )
      // )
      //   .to.emit(journeyPass, 'FlagUpdatedNS')
      //   .withArgs(
      //     NAMESPACE_KYC,
      //     tokenId,
      //     0,
      //     true,
      //     flagSetter.address,
      //     ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001')),
      //     evidenceHash,
      //     validUntil
      //   );
    });

    it.skip('MetadataUpdateイベントが発火される（EIP-4906）', async () => {
      // const tokenId = 1;
      //
      // await expect(
      //   journeyPass.connect(flagSetter).setFlagNS(
      //     tokenId,
      //     NAMESPACE_STAMP_2024,
      //     0,
      //     true,
      //     ethers.utils.keccak256(ethers.utils.toUtf8Bytes('trace-001')),
      //     ethers.constants.HashZero,
      //     0
      //   )
      // ).to.emit(journeyPass, 'MetadataUpdate').withArgs(tokenId);
    });
  });

  describe('View関数（v2）', () => {
    it.skip('flagsOfNS()が正しいフラグを返す', async () => {
      // const tokenId = 1;
      //
      // // bit 0, 1, 2をセット
      // await journeyPass.connect(flagSetter).setFlagNS(tokenId, NAMESPACE_STAMP_2024, 0, true, ethers.constants.HashZero, ethers.constants.HashZero, 0);
      // await journeyPass.connect(flagSetter).setFlagNS(tokenId, NAMESPACE_STAMP_2024, 1, true, ethers.constants.HashZero, ethers.constants.HashZero, 0);
      // await journeyPass.connect(flagSetter).setFlagNS(tokenId, NAMESPACE_STAMP_2024, 2, true, ethers.constants.HashZero, ethers.constants.HashZero, 0);
      //
      // const flags = await journeyPass.flagsOfNS(tokenId, NAMESPACE_STAMP_2024);
      // expect(flags).to.equal(0x07); // 0b111 = bit 0, 1, 2がセット
    });

    it.skip('validUntilNS()が正しい有効期限を返す', async () => {
      // const tokenId = 1;
      // const validUntil = Math.floor(Date.now() / 1000) + 3600;
      //
      // await journeyPass.connect(flagSetter).setFlagNS(
      //   tokenId,
      //   NAMESPACE_KYC,
      //   0,
      //   true,
      //   ethers.constants.HashZero,
      //   ethers.constants.HashZero,
      //   validUntil
      // );
      //
      // expect(await journeyPass.validUntilNS(tokenId, NAMESPACE_KYC, 0)).to.equal(validUntil);
    });
  });
});
