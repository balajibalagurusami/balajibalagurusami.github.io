# Classmate contacts backend contract

The `/classmates` page is intentionally unable to store contact data in GitHub Pages. It expects the existing authenticated WILP backend at `https://wilptest.aecbim.work` to provide these endpoints.

## Authentication

All endpoints below must require the existing authenticated session and reject users whose verified session email does not end in `@wilp.bits-pilani.ac.in`.

Do not trust an email address supplied by the browser. Always derive the email from the verified session.

## `GET /api/classmates/me`

Returns the signed-in user's saved contact, or `404` when none exists.

```json
{
  "contact": {
    "email": "student@wilp.bits-pilani.ac.in",
    "name": "Student Name",
    "whatsapp": "+919876543210",
    "updatedAt": "2026-08-31T12:00:00Z"
  }
}
```

## `POST /api/classmates`

Request body is JSON transported as `text/plain;charset=UTF-8` to match the current cross-origin API pattern:

```json
{
  "name": "Student Name",
  "whatsapp": "+919876543210"
}
```

The backend must:

- validate authentication and the BITS WILP email domain;
- normalize and validate the phone number;
- limit name and phone lengths;
- upsert by authenticated email so one student has one current record;
- return the saved record;
- rate-limit writes.

## `GET /api/classmates`

Returns the current directory to authenticated BITS WILP users only:

```json
{
  "contacts": [
    {
      "email": "student@wilp.bits-pilani.ac.in",
      "name": "Student Name",
      "whatsapp": "+919876543210",
      "updatedAt": "2026-08-31T12:00:00Z"
    }
  ]
}
```

The client converts this response to a VCF file locally. Do not expose this endpoint publicly and do not cache it at the CDN edge.

## Suggested D1 schema

```sql
CREATE TABLE IF NOT EXISTS classmates (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Recommended response headers for directory endpoints:

```text
Cache-Control: no-store, private
Content-Type: application/json; charset=utf-8
```

The existing CORS policy must continue to allow only the production web origin and authenticated credentials.
