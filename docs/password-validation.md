# Password Validation Rules

## Length

| Constraint | Value  | Reason                                      |
| ---------- | ------ | ------------------------------------------- |
| Minimum    | 8      | NIST SP 800-63B / OWASP minimum             |
| Maximum    | 72     | bcrypt truncates input beyond 72 bytes       |

## Character Requirements

| Rule              | Regex            | Example     |
| ----------------- | ---------------- | ----------- |
| Lowercase letter  | `/[a-z]/`        | a, b, z     |
| Uppercase letter  | `/[A-Z]/`        | A, B, Z     |
| Digit             | `/\d/`           | 0, 5, 9     |
| Special character | `/[^A-Za-z0-9]/` | @, #, !, $  |

All four character rules must be satisfied simultaneously.

## Error Messages

| Condition              | Message                                                |
| ---------------------- | ------------------------------------------------------ |
| Too short              | Password must be at least 8 characters long.           |
| Too long               | Password must be at most 72 characters long.           |
| Missing lowercase      | Password must include at least one lowercase letter.   |
| Missing uppercase      | Password must include at least one uppercase letter.   |
| Missing digit          | Password must include at least one number.             |
| Missing special char   | Password must include at least one special character.  |

## Valid Password Examples

| Password         | Valid |
| ---------------- | ----- |
| `Abc1@xyz`       | Yes   |
| `abcdefgh`       | No (missing uppercase, digit, special) |
| `ABCDEFGH`       | No (missing lowercase, digit, special) |
| `Abcdefgh`       | No (missing digit, special) |
| `Abcdefg1`       | No (missing special) |
| `Ab1!`           | No (too short) |
