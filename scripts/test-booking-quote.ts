import assert from 'node:assert/strict';
import { Address, Hex, keccak256, toBytes, verifyTypedData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  MOCK_SIGNATURE,
  QUOTE_DOMAIN_NAME,
  QUOTE_DOMAIN_VERSION,
  assertExpectedQuoteSignerAddress,
  assertQuoteSignerRole,
  parseExpectedQuoteSignerAddress,
  requireQuoteSignerPrivateKey,
  resolveQuoteMode,
  shouldStrictlyValidateProvider,
} from '../src/app/api/booking/quote/policy';

const mustThrowCode = (label: string, fn: () => unknown, code: string) => {
  assert.throws(
    fn,
    (error: unknown) =>
      error instanceof Error &&
      'code' in error &&
      (error as Error & { code: string }).code === code,
    label
  );
};

const bookingQuoteTypes = {
  BookingQuote: [
    { name: 'quoteId', type: 'bytes32' },
    { name: 'buyer', type: 'address' },
    { name: 'providerId', type: 'uint256' },
    { name: 'hoursWad', type: 'uint256' },
    { name: 'slotId', type: 'uint256' },
    { name: 'expiresAt', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

async function main() {
  assert.equal(resolveQuoteMode({ envMode: undefined, requestedMode: undefined }), 'real');
  assert.equal(resolveQuoteMode({ envMode: 'auto', requestedMode: 'auto' }), 'real');
  assert.equal(resolveQuoteMode({ envMode: 'real', requestedMode: 'real' }), 'real');

  mustThrowCode(
    'missing key fails real/auto config',
    () => requireQuoteSignerPrivateKey(undefined),
    'QUOTE_SIGNER_PRIVATE_KEY_MISSING'
  );
  mustThrowCode(
    'invalid key fails real/auto config',
    () => requireQuoteSignerPrivateKey('0x1234'),
    'QUOTE_SIGNER_PRIVATE_KEY_INVALID'
  );
  mustThrowCode(
    'invalid signer address fails config',
    () => parseExpectedQuoteSignerAddress('not-an-address'),
    'QUOTE_SIGNER_ADDRESS_INVALID'
  );

  const privateKey = keccak256(toBytes('time-tokenAIzer booking quote test signer'));
  const signer = privateKeyToAccount(requireQuoteSignerPrivateKey(privateKey));
  const bookingManagerAddress = '0x1111111111111111111111111111111111111111' as Address;

  mustThrowCode(
    'signer address mismatch fails config',
    () =>
      assertExpectedQuoteSignerAddress(
        signer.address,
        '0x2222222222222222222222222222222222222222' as Address
      ),
    'QUOTE_SIGNER_ADDRESS_MISMATCH'
  );
  assert.doesNotThrow(() =>
    assertExpectedQuoteSignerAddress(
      signer.address,
      parseExpectedQuoteSignerAddress(signer.address)
    )
  );

  mustThrowCode(
    'signer without quote role fails',
    () =>
      assertQuoteSignerRole({
        hasRole: false,
        signerAddress: signer.address,
        bookingManagerAddress,
      }),
    'QUOTE_SIGNER_ROLE_MISSING'
  );

  mustThrowCode(
    'request mock cannot enable mock without server env',
    () => resolveQuoteMode({ envMode: 'auto', requestedMode: 'mock' }),
    'MOCK_MODE_DISABLED'
  );
  mustThrowCode(
    'mock mode is blocked in production',
    () => resolveQuoteMode({ envMode: 'mock', requestedMode: 'auto', nodeEnv: 'production' }),
    'MOCK_MODE_PRODUCTION_DISABLED'
  );
  assert.equal(
    resolveQuoteMode({ envMode: 'mock', requestedMode: 'auto', nodeEnv: 'test' }),
    'mock'
  );

  assert.equal(
    shouldStrictlyValidateProvider('real', 'false'),
    true,
    'real/auto quote mode must ignore lax provider validation'
  );
  assert.equal(shouldStrictlyValidateProvider('mock', 'false'), false);

  assert.doesNotThrow(() =>
    assertQuoteSignerRole({
      hasRole: true,
      signerAddress: signer.address,
      bookingManagerAddress,
    })
  );

  const message = {
    quoteId: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex,
    buyer: '0x3333333333333333333333333333333333333333' as Address,
    providerId: BigInt(1),
    hoursWad: BigInt('2000000000000000000'),
    slotId: BigInt(42),
    expiresAt: BigInt(4102444800),
    nonce: BigInt(99),
  };
  const signature = await signer.signTypedData({
    domain: {
      name: QUOTE_DOMAIN_NAME,
      version: QUOTE_DOMAIN_VERSION,
      chainId: 84532,
      verifyingContract: bookingManagerAddress,
    },
    primaryType: 'BookingQuote',
    types: bookingQuoteTypes,
    message,
  });

  assert.notEqual(signature, MOCK_SIGNATURE, 'happy-path signature must not be mock');
  assert.equal(signer.address, privateKeyToAccount(privateKey).address);
  assert.equal(
    await verifyTypedData({
      address: signer.address,
      domain: {
        name: QUOTE_DOMAIN_NAME,
        version: QUOTE_DOMAIN_VERSION,
        chainId: 84532,
        verifyingContract: bookingManagerAddress,
      },
      primaryType: 'BookingQuote',
      types: bookingQuoteTypes,
      message,
      signature,
    }),
    true,
    'happy-path signature must verify against BookingManager EIP-712 domain'
  );

  console.log('booking quote policy tests passed');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
