import { TypedDataEncoder, TypedDataField } from 'ethers'

import { mkdir, writeFile } from 'fs'

import { emporiumConfig as config } from '../config'
import { Typename, Types } from './types'
import { TypedDataType } from 'abitype/zod'

const LICENSE = `// SPDX-License-Identifier: ${config.contract.license}\n`
const VERSION = `pragma solidity ${config.contract.solidity};\n`

const HEADER = `/**
 * @title Framework:${config.contract.name}
 * @notice The base EIP-712 types that power a modern intent framework.
 * @dev This file was auto-generated by @nftchance/emporium-types/cli 
 *      and should not be edited directly otherwise the alchemy 
 *      will fail and you will have to pay with a piece of your soul.
 *      (https://github.com/nftchance/emporium-types)
 * @dev This interface and the consuming abstract are auto-generated by
 *      types declared in the framework configuration at (./config.ts). 
 *      As an extensible base, all projects build on top of Delegations 
 *      and Invocations.
${config.contract.authors}
 */`
const INTERFACE = `interface I${config.contract.name} {`
const CONTRACT = `}

/**
 * @title Framework:${config.contract.name} 
 * @dev This file was auto-generated by @nftchance/emporium-types/cli.
 *      (https://github.com/nftchance/emporium-types)
 * @dev This abstract contract is auto-generated and should not be edited directly
 *      however it should be directly inherited from in the consuming protocol
 *      to power the processing of generalized intents.
${config.contract.authors}
 */
abstract contract ${config.contract.name} is I${config.contract.name} {`

export function getPacketHashGetterName(typeName: Typename) {
	if (typeName.includes('[]')) {
		if (config.dangerous.useOverloads) return `getArrayPacketHash`

		return `get${config.dangerous.packetHashName(
			typeName.substr(0, typeName.length - 2)
		)}ArrayPacketHash`
	}

	if (config.dangerous.useOverloads) return `getPacketHash`

	return `get${config.dangerous.packetHashName(typeName)}PacketHash`
}

export function getEncodedValueFor(field: TypedDataField) {
	// * Hashed types.
	if (field.type === 'bytes') return `keccak256($input.${field.name})`

	// * Basic types.
	const isBasicType = TypedDataType.safeParse(field.type)

	if (isBasicType.success) return `$input.${field.name}`

	// * Array and object types (ie: nested values.)
	return `${getPacketHashGetterName(field.type)}($input.${field.name})`
}

export function getPacketHashGetters<
	TTypes extends Types,
	TTypename extends Typename<TTypes>
>(
	typeName: TTypename,
	fields: TTypes[TTypename],
	packetHashGetters: Array<string> = []
) {
	if (typeName.includes('[]')) {
		packetHashGetters.push(getArrayPacketHashGetter(typeName))
	} else {
		packetHashGetters.push(`\t/**
    * @notice Encode ${typeName} data into a packet hash and verify decoded ${typeName} data 
    *         from a packet hash to verify type compliance and value-width alignment.
    * @param $input The ${typeName} data to encode.
    * @return $hash The packet hash of the encoded ${typeName} data.
    */
    function ${getPacketHashGetterName(typeName)}(
        ${typeName} memory $input
    ) 
        public 
        pure 
        returns (bytes32 $hash) 
    {
        $hash = keccak256(abi.encode(
            ${typeName
				.replace(/([A-Z])/g, '_$1')
				.slice(1)
				.toUpperCase()}_TYPEHASH,
            ${fields.map(getEncodedValueFor).join(',\n\t\t\t')}
        ));
    }\n`)
	}

	fields.forEach(field => {
		if (field.type.includes('[]')) {
			packetHashGetters.push(getArrayPacketHashGetter(field.type))
		}
	})

	return packetHashGetters
}

export const getArrayPacketHashGetter = (typeName: Typename) => `\t/**
    * @notice Encode ${typeName} data into a packet hash and verify decoded ${typeName} data 
    *         from a packet hash to verify type compliance and value-width alignment.
    * @param $input The ${typeName} data to encode. 
    * @return $hash The packet hash of the encoded ${typeName} data.
    */
    function ${getPacketHashGetterName(typeName)}(
        ${typeName} memory $input
    ) 
        public 
        pure 
        returns (bytes32 $hash) 
    {
        bytes memory encoded;

        uint256 i;
        uint256 length = $input.length;

        for (i; i < length;) {
            encoded = bytes.concat(
                encoded,
                ${getPacketHashGetterName(
					typeName.substr(0, typeName.length - 2)
				)}($input[i])
            );

            unchecked { i++; }
        }
        
        $hash = keccak256(encoded);
    }`

export function getSolidity(types: Types) {
	const results: { struct: string; typeHash: string }[] = []
	const packetHashGetters: string[] = []

	const encoder = new TypedDataEncoder(types)

	Object.keys(types).forEach(typeName => {
		// * Determine the name of the type hash constant.
		const typeHashName = `${typeName
			.replace(/([A-Z])/g, '_$1')
			.slice(1)
			.toUpperCase()}_TYPEHASH`

		// * Generate the basic solidity code for the type hash.
		// ! Really, there is no reason to use the human readable version if we can just encode it.
		const typeHash = `\t/**
    * @dev Type hash representing the ${typeName} data type providing EIP-712
    *      compatability for encoding and decoding.
    * 
    * ${typeHashName} extends TypeHash<EIP712<{
    *   ${types[typeName]
		.map(field => {
			return `{ name: '${field.name}', type: '${field.type}' }`
		})
		.join('\n\t*   ')} 
    * }>>
    */
    bytes32 constant ${typeHashName} = keccak256('${encoder.encodeType(
		typeName
	)}');\n`

		packetHashGetters.push(
			...getPacketHashGetters(
				typeName,
				types[typeName],
				packetHashGetters
			)
		)

		results.push({
			struct: `\t/**
     * @notice This struct is used to encode ${typeName} data into a packet hash and
     *         decode ${typeName} data from a packet hash.
     * 
     * ${typeName} extends EIP712<{ 
     *    ${types[typeName]
			.map(field => {
				return `{ name: '${field.name}', type: '${field.type}' }`
			})
			.join('\n\t *    ')}
     * }>
     */
    struct ${typeName} {\n${types[typeName]
		.map(field => {
			return `\t\t${field.type} ${field.name};\n`
		})
		.join('')}\t}`,
			typeHash
		})
	})

	console.log(
		`have generated ${packetHashGetters.length} packet hash getters`
	)

	return {
		setup: results,
		packetHashGetters: [...new Set(packetHashGetters)]
	}
}

export async function generate(filename: string | undefined) {
	const { setup, packetHashGetters } = getSolidity(
		config.types as unknown as Types
	)

	filename = filename ?? config.output

	const lines: string[] = [LICENSE, VERSION, HEADER, INTERFACE]

	const structs: string[] = []
	const typeHashes: string[] = []

	setup.forEach(type => {
		structs.push(type.struct)
		typeHashes.push(type.typeHash)
	})

	// * Interface struct declarations.
	lines.push(structs.join('\n\n'))

	lines.push(CONTRACT)

	// * Base abstract contract pieces.
	lines.push(typeHashes.join('\n'))
	lines.push(packetHashGetters.join('\n'))

	mkdir(
		filename.split('/').slice(0, -1).join('/'),
		{ recursive: true },
		error => {
			if (error) {
				throw error
			}
		}
	)

	lines.push('}')

	writeFile(filename, lines.join('\n'), error => {
		if (error) throw error
	})
}
