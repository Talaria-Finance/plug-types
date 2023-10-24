import { Config } from '@/core/config'

const EIP721_TYPES = {
	EIP712Domain: [
		{ name: 'name', type: 'string' },
		{ name: 'version', type: 'string' },
		{ name: 'chainId', type: 'uint256' },
		{ name: 'verifyingContract', type: 'address' }
	]
} as const

const DELEGATION_TYPES = {
	Delegation: [
		{ name: 'delegate', type: 'address' },
		{ name: 'authority', type: 'bytes32' },
		{ name: 'caveats', type: 'Caveat[]' },
		{ name: 'salt', type: 'bytes32' }
	],
	Caveat: [
		{ name: 'enforcer', type: 'address' },
		{ name: 'terms', type: 'bytes' }
	]
} as const

const INVOCATION_TYPES = {
	...DELEGATION_TYPES,
	Transaction: [
		{ name: 'to', type: 'address' },
		{ name: 'gasLimit', type: 'uint256' },
		{ name: 'data', type: 'bytes' }
	],
	SignedDelegation: [
		{ name: 'delegation', type: 'Delegation' },
		{ name: 'signature', type: 'bytes' }
	],
	Invocation: [
		{ name: 'transaction', type: 'Transaction' },
		{ name: 'authority', type: 'SignedDelegation[]' }
	]
} as const

const INVOCATIONS_TYPES = {
	...INVOCATION_TYPES,
	ReplayProtection: [
		{ name: 'nonce', type: 'uint256' },
		{ name: 'queue', type: 'uint256' }
	],
	Invocations: [
		{ name: 'batch', type: 'Invocation[]' },
		{ name: 'replayProtection', type: 'ReplayProtection' }
	]
} as const

const SIGNED_INVOCATION_TYPES = {
	...INVOCATIONS_TYPES,
	SignedInvocation: [
		{ name: 'invocations', type: 'Invocations' },
		{ name: 'signature', type: 'bytes' }
	]
} as const

export const constants = {
	config: {
		contract: {
			name: 'Temp',
			license: 'BUSL-1.1',
			solidity: '^0.8.19',
			authors: []
		},
		types: EIP721_TYPES,
		dangerous: {
			useOverloads: true,
			packetHashName: (typeName: string) => typeName,
			excludeCoreTypes: false
		},
		out: './temp'
	} as Config,
	types: {
		...SIGNED_INVOCATION_TYPES
	}
} as const
