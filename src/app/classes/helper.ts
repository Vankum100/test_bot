import * as fs from 'fs';
import * as path from 'path';
import { setTimeout } from 'safe-timers';
import { validate } from 'uuid';
import {
  RussianToEnglishMap,
  russianToEnglishMap
} from './assets/russian-to-english-map';

export class Helper {
  static timeZone: number = -new Date().getTimezoneOffset();

  static sleep(sec: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, sec * 1000));
  }

  static getRandomId(): number {
    return (
      Math.ceil(Math.random() * 0xffffff) + Math.ceil(Math.random() * 0xffffff)
    );
  }

  static getRandomNumber(offset: number): number {
    return Math.floor(Math.random() * offset);
  }

  static generateRandomText(length: number = 6): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  }

  static getRangeRandomNumber(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static writeToFile(fileName: string, content: string): void {
    fs.writeFile(path.resolve(`./${fileName}.txt`), content, error => {
      if (error) {
        throw error;
      }
    });
  }

  static appendToFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.appendFile(filePath, content + '\r\n', (error) => {
      if (error) {
        console.error(`Ошибка записи в файл ${filePath}:`, error);
      }
    });
  }

  static getClearDate(date: string): string {
    return date
      .replace('"', '')
      .replace(/T/, ' ')
      .replace(/\..+|\+.+/, '');
  }

  static getDateNow(): string {
    const timestamp = Date.now() + Helper.timeZone * 60 * 1000;
    return new Date(timestamp).toISOString();
  }

  static getClearDateNow(): string {
    return this.getClearDate(this.getDateNow());
  }

  static getDateWithAddedTime(minutes: number): string {
    const timestamp = Date.now() + (Helper.timeZone + minutes) * 60 * 1000;
    return new Date(timestamp).toISOString();
  }

  static getClearDateWithAddedTime(minutes: number): string {
    return this.getClearDate(this.getDateWithAddedTime(minutes));
  }

  static getStartDate(): string {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString();
  }

  static getClearStartDate(): string {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    return this.getClearDate(date.toISOString());
  }

  static getEndDate(): string {
    const date = new Date();
    date.setUTCHours(23, 59, 59, 999);
    return date.toISOString();
  }

  static getClearEndDate(): string {
    const date = new Date();
    date.setUTCHours(23, 59, 59, 999);
    return this.getClearDate(date.toISOString());
  }

  static replaceAt(string: string, index: number, replacement: string): string {
    return (
      string.substring(0, index) +
      replacement +
      string.substring(index + replacement.length)
    );
  }

  static getRandomString(offset: number): string {
    const range: number = Math.ceil(offset / 8);
    let string = '';
    for (let i = 0; i < range; i++) {
      string += Math.random().toString(36).slice(-8);
    }
    return string.substring(0, offset);
  }

  static uint8ArrayToNumber(uint8Array: Uint8Array): number {
    const view = new DataView(uint8Array.buffer, 0);
    return view.getUint32(0, true);
  }

  static uint8ArrayToBigInt(uint8Array: Uint8Array): bigint {
    const hexString = Array.from(uint8Array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    return BigInt('0x' + hexString);
  }

  static int256ToBytes(int: bigint): Buffer {
    const bytesArray = [];
    for (let i = 0; i < 32; i++) {
      let shift = int >> BigInt(8 * i);
      shift &= BigInt(255);
      bytesArray[i] = Number(String(shift));
    }
    return Buffer.from(bytesArray);
  }

  static isEmpty(array: any[] | undefined): boolean {
    return array === undefined || array.length === 0;
  }

  static getDayAndMonth(): { day: string | number; month: string | number } {
    const date = new Date();
    const day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    const month =
      date.getMonth() + 1 < 10
        ? '0' + (date.getMonth() + 1)
        : date.getMonth() + 1;
    return { day, month };
  }

  static getHourAndMinutesInDate(date: Date): {
    hour: string | number;
    minutes: string | number;
  } {
    const hour = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    const minutes =
      date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    return { hour, minutes };
  }

  static isValueInEnum(value: string, enumType: any): boolean {
    return Object.values(enumType).includes(value);
  }

  static getKeyByValue(
    object: Record<string, string>,
    valueToFind: string
  ): string | undefined {
    return Object.keys(object).find(key => object[key] === valueToFind);
  }

  static chunkArray(array: any[], chunk: number) {
    const newArray = [];
    for (let i = 0; i < array.length; i += chunk) {
      newArray.push(array.slice(i, i + chunk));
    }
    return newArray;
  }

  static chunkMap<Key, Value>(
    map: Map<Key, Value>,
    chunkSize: number
  ): Map<Key, Value>[] {
    const chunks: Map<Key, Value>[] = [];
    let currentChunk = new Map<Key, Value>();

    let index = 0;
    map.forEach((value, key) => {
      currentChunk.set(key, value);
      index++;

      if (index % chunkSize === 0) {
        chunks.push(currentChunk);
        currentChunk = new Map<Key, Value>();
      }
    });

    if (currentChunk.size > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  static isUuid4(uuid: string): boolean {
    return validate(uuid);
  }

  static getValuesByKeys(array: any[], keys: string[]): [] {
    return array.reduce((acc, item) => {
      keys.forEach(key => {
        if (item[key] !== undefined) {
          acc.push(item[key]);
        }
      });
      return acc;
    }, []);
  }

  static slugify(str: string): string {
    const slug = str.replace(/[^a-zA-Zа-яА-Я0-9]/g, '');

    const transliterated = slug.replace(/[а-яА-Я]/g, match => {
      return (
        russianToEnglishMap[match.toLowerCase() as keyof RussianToEnglishMap] ||
        ''
      );
    });

    const lowercased = transliterated.toLowerCase();

    return lowercased;
  }

  static groupBy<T extends Record<K, any>, K extends keyof T>(
    arr: T[],
    key: K
  ): Record<T[K], T[]> {
    return arr.reduce(
      (groups, obj) => {
        const keyValue = obj[key];
        const group = groups[keyValue] || [];
        group.push(obj);
        groups[keyValue] = group;
        return groups;
      },
      {} as Record<T[K], T[]>
    );
  }

  static isValidRegex(pattern: string): boolean {
    try {
      new RegExp(pattern);
      return true;
    } catch (e) {
      return false;
    }
  }
}
