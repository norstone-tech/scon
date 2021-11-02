```
"SCON 3"

Type byte
########
01234567

0-2: Base type
  3: Base type parsing method
  4: IsExtendedType (1 extra byte, extended type 0 is the same as no extended type)
  5: IsReferenceDefinition (value is prefixed with a varint representing its reference number)
  6: Multiple meanings
    - Ignored if parsing array
    - If parsing object map: key is reference
    - If this is a reference definition: This value may be replacing a previously defined reference definition @ (varint value)
  7: Value is reference

* references are parsed using varint
* technically a reference definition can be made that just leads to another reference
* All extended types beyond 128 are user-definable
* Extended types do not change parsing in any way, but change how to interpret the data given

Base types
0: Stop (Other bits ignored)
1: null
  - parse methods identical
  - no extended types (all are ignored)
2: boolean
  - parse method is the boolean bit
  - no extended types (all are ignored)
3: fixedFloat
  - parse method 0 = 32-bit, parse method 1 = 64-bit
  - no extended types (all are ignored)
4: varInt
  - parse method is the sign, 0 means positive, 1 means negative
  - 7 bits, (BE?) if highest bit is set, left-shift result by 7 bits, read next byte as part of result
  - Extended type 0: abs(value) is guaranteed to be below abs(2 ** 53) (default)
  - Extended type 2: Value has the range of of a 8-bit uint
  - Extended type 3: Value has the range of of a 8-bit sint
  - Extended type 4: Value has the range of of a 16-bit uint
  - Extended type 5: Value has the range of of a 16-bit sint
  - Extended type 6: Value has the range of of a 32-bit uint
  - Extended type 7: Value has the range of of a 32-bit sint
  - Extended type 8: Value has the range of of a 64-bit uint (always BigInt in JS)
  - Extended type 9: Value has the range of of a 64-bit sint (always BigInt in JS)
  - Extended type 10: Value has the range of of a 128-bit uint (always BigInt in JS)
  - Extended type 11: Value has the range of of a 128-bit sint (always BigInt in JS)
  - Extended type 12: Value has the range of of a 256-bit uint (always BigInt in JS)
  - Extended type 13: Value has the range of of a 256-bit sint (always BigInt in JS)

  - Extended type 16: BigInt (Infinite)
  - Extended type 32: parse as Date (Second unix time)
  - Extended type 33: Parse as Date (Millisecond unix time)
  - Unknown extended type: parse as type 16
5: Null-terminated string
  - parse method 0: binary 1: utf8
  - no extended types (all are ignored)
6: length-prefixed string
  - reads a varint to see what length the string is, then reads x many bytes
  - no extended types (all are ignored)
7: Nested object
  - parse method 0 is a map, parse method 1 is an array
  - no extended types (all are ignored)
```
