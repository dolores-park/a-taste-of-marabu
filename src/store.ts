export type ObjectId = string

import level from 'level-ts'
import { canonicalize } from 'json-canonicalize'
import { AnnotatedError, ObjectType, ObjectTxOrBlock } from './message'
import { Transaction } from './transaction'
import { Block } from './block'
import { logger } from './logger'
import { hash } from './crypto/hash'

export const db = new level('./db')

export class ObjectStorage {
  static id(obj: any) {
    const objStr = canonicalize(obj)
    const objId = hash(objStr)
    return objId
  }
  static async exists(objectid: ObjectId) {
    return await db.exists(`object:${objectid}`)
  }
  static async get(objectid: ObjectId) {
    try {
      return await db.get(`object:${objectid}`)
    } catch {
      throw new AnnotatedError('UNKNOWN_OBJECT', `Object ${objectid} not known locally`)
    }
  }
  static async del(objectid: ObjectId) {
    try {
      return await db.del(`object:${objectid}`)
    } catch {
      throw new AnnotatedError('UNKNOWN_OBJECT', `Object ${objectid} not known locally`)
    }
  }
  static async put(object: any) {
    logger.debug(`Storing object with id ${this.id(object)}: %o`, object)
    return await db.put(`object:${this.id(object)}`, object)
  }
  static async putUTXO(objectid: ObjectId, txids: string[]) {
    logger.debug(`Storing UTXO with id ${objectid}: %o`, txids)
    return await db.put(`utxo:${objectid}`, txids)
  }
  static async getUTXO(objectid: ObjectId) {
    try {
      return await db.get(`utxo:${objectid}`)
    } catch {
      throw new AnnotatedError('UNKNOWN_OBJECT', `Error fetching UTXO: Object ${objectid} not known locally`)
    }
  }
  static async existUTXO(objectid: ObjectId) {
    return await db.exists(`utxo:${objectid}`)
  }
  static async validate(object: ObjectType) {
    if (!ObjectTxOrBlock.guard(object)) {
      console.error('Invalid object: %o', object)
      throw new AnnotatedError('INVALID_FORMAT', 'Failed to parse object')
    }
    await ObjectTxOrBlock.match(
      async (object) => { //transaction
        const tx = Transaction.fromNetworkObject(object)
        await tx.validate()
      },
      async (object) => { //block
        const block = Block.fromNetworkObject(object)
        await block.validate()
      }
    )(object)
  }
}
