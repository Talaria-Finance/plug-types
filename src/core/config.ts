import { TypedData } from 'abitype'

import { constants } from '@/lib/constants'

type Contract = {
	authors: Array<string> | string
	name: string
	license: string
	solidity: string
}

type Dangerous = {
	excludeCoreTypes: boolean
	useOverloads: boolean
	packetHashName: (typeName: string) => string
}

export type Config = {
	contract: Contract
	types: TypedData
	out: string
	dangerous: Dangerous
}

export function config({
	contract,
	types,
	out,
	dangerous
}: Partial<{
	contract: Partial<Contract>
	types: TypedData
	out: string
	dangerous: Partial<Dangerous>
}> = {}): Config {
	return {
		contract: {
			...{
				name: 'Types',
				license: 'BUSL-1.1',
				solidity: '^0.8.19'
			},
			...contract,
			authors: [
				'@nftchance',
				`@nftchance/emporium-types (${
					new Date().toISOString().split('T')[0]
				})`,
				'@danfinlay (https://github.com/delegatable/delegatable-sol)',
				'@KamesGeraghty (https://github.com/kamescg)'
			]
				.concat(contract?.authors ?? [])
				.map(author => ` * @author ${author}`)
				.join('\n')
		},
		types:
			types !== undefined
				? {
						...constants.types,
						...types
						// eslint-disable-next-line no-mixed-spaces-and-tabs
				  }
				: constants.types,
		out: out ?? `./dist/contracts/`,
		dangerous: {
			...{
				excludeCoreTypes: false,
				useOverloads: false,
				packetHashName: (typeName: string) =>
					typeName.slice(0, 1).toUpperCase() + typeName.slice(1)
			},
			...dangerous
		}
	} as const
}
