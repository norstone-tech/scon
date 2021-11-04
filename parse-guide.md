```
"Scon 3" 

Type byte
########
01234567

0-2: Base type
  3: Base type parsing method/variant
  4: IsExtendedType (1 extra byte, extended type 0 is the same as no extended type)
  5: IsReferenceDefinition
  6: Multiple meanings
    - Ignored if parsing array
    - If parsing object map: key is reference
    - If this is a reference definition: This value may be replacing a previously defined reference definition @ (varint value)
  7: Value is reference (varint value) value type SHOULD match

* keys are always a null-terminated string, or a reference leading to a utf8-encoded string
* references are parsed using varint
* technically a reference definition can be made that just leads to another reference
* All extended types beyond 128 are user-definable
* Extended types do not change parsing in any way, but change how to interpret the data given
* No type enforcement with maps or arrays, that can be handeled by the user

Base types
0: Stop - End of object or array (Other bits ignored)
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
  - Unknown extended type: Interpret as type 16
5: Null-terminated string
  - parse method 0: binary 1: utf8
  - no extended types (all are ignored)
6: length-prefixed string
  - reads a varint to see what length the string is, then reads x many bytes
  - no extended types (all are ignored)
7: Nested object
  - parse method 0 is an object, parse method 1 is an array
  - Extended type 1: Map<string, any> if object. Set<any> if array
  - Extended type 2: Always Map<any, any>, same as above if object, though as array, the array must contain arrays containing key/value pairs (like what you can specify in the Map constructor)
  - Unknown extended type: interpret as 0
```
