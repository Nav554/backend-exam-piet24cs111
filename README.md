# Backend Practical Exam

**NAV PARIKH · PIET24CS111**

## Submission layout

```
backend_exam_PIET24CS111_NAV PARIKH/
└── backend_Practical_PIET24CS111_NAV PARIKH/
    ├── file/
    │   ├── task1-library-api/
    │   └── task2-student-portal/
    ├── outputs/
    └── README.md
```

The submission guideline's A1 entry maps to `file/task1-library-api/server.js`. The A2 entry maps to `file/task2-student-portal/server.js`. Each entry belongs to a separate Express app with its own package manifest, lockfile and MongoDB configuration. The guideline also shows an A3 entry. The supplied task sheets cover A1 and A2.

## 1. Start MongoDB on Windows

Install Node.js 24 LTS and MongoDB Community Server. Open PowerShell and check whether a MongoDB service is registered.

```powershell
Get-Service -Name MongoDB -ErrorAction SilentlyContinue
```

If it is registered and stopped, open PowerShell as Administrator and run `Start-Service MongoDB`. This device uses a per-user standalone installation. To start that installation, run the following in an ordinary PowerShell window and leave it open while you use the apps. The command checks the per-user install first and then the standard Windows installer location.

```powershell
$mongo = Join-Path $env:LOCALAPPDATA 'Programs\MongoDB\9.0.4\bin\mongod.exe'
if (-not (Test-Path -LiteralPath $mongo)) {
    $mongo = Get-ChildItem -Path "$env:ProgramFiles\MongoDB\Server\*\bin\mongod.exe" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $mongo) { throw 'Install MongoDB Community Server first.' }
$mongoData = Join-Path $env:LOCALAPPDATA 'BackendExam\PIET24CS111\mongodb-data'
New-Item -ItemType Directory -Path $mongoData -Force | Out-Null
& $mongo --dbpath $mongoData --bind_ip 127.0.0.1 --port 27017
```

Run one MongoDB instance on port `27017`. If one is already running at `127.0.0.1:27017`, use it. For a new installation, use the [official Windows installation instructions](https://www.mongodb.com/docs/manual/administration/install-community-windows/).

## 2. Start the Library API

From the folder that contains this README, open a new PowerShell window and run:

```powershell
Set-Location -LiteralPath '.\file\task1-library-api'
npm.cmd ci
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
npm.cmd start
```

The API listens at `http://127.0.0.1:3000` and uses the `piet24cs111_library` database. `PUT /books/:id` updates the supplied fields and keeps the rest of the book. `title` and `author` are required at creation. `price` is optional and must be a number of at least `1` when supplied.

## 3. Start the Student Portal

From the folder that contains this README, open a second PowerShell window and run:

```powershell
Set-Location -LiteralPath '.\file\task2-student-portal'
npm.cmd ci
if (-not (Test-Path -LiteralPath '.env')) {
    $portalConfig = Get-Content -LiteralPath '.env.example' -Raw
    $jwtSecret = node -p "require('node:crypto').randomBytes(32).toString('hex')"
    $adminKey = node -p "require('node:crypto').randomBytes(32).toString('hex')"
    $portalConfig.Replace('JWT_SECRET=', "JWT_SECRET=$jwtSecret").Replace(
        'ADMIN_REGISTRATION_KEY=', "ADMIN_REGISTRATION_KEY=$adminKey"
    ) | Set-Content -LiteralPath '.env' -Encoding ascii -NoNewline
}
npm.cmd start
```

The portal listens at `http://127.0.0.1:3001` and uses the `piet24cs111_portal` database. Keep both `.env` files private and use `.env.example` when sharing the source. The portal accepts `role: "student"` by default. Registering with `role: "admin"` requires the `X-Admin-Registration-Key` header, whose value is the `ADMIN_REGISTRATION_KEY` from the portal's `.env`. `GET /students` returns accounts with the `student` role.

## 4. Capture the Library API screenshots

Use Postman or Thunder Client with `Content-Type: application/json` for requests that have a body. The status, request method and URL, and response body should be visible in each screenshot. Save captures in `outputs/`.

Set the client variable `library` to `http://127.0.0.1:3000`. After creating the book, copy the response's `_id` into a variable named `bookId`.

| Request | JSON body | Expected | Screenshot |
| --- | --- | --- | --- |
| `POST {{library}}/books` | `{"title":"Clean Code","author":"Robert C. Martin","price":499,"category":"Programming"}` | `201` with `isAvailable: true` and an `_id` | `A1-create.png` |
| `GET {{library}}/books/{{bookId}}` | — | `200` with the created book | `A1-get-one.png` |
| `PUT {{library}}/books/{{bookId}}` | `{"price":449,"isAvailable":false}` | `200` with the updated book | `A1-update.png` |
| `GET {{library}}/books` | — | `200` with the updated book in the list | `A1.png` |
| `POST {{library}}/books` | `{"title":"Invalid price","author":"Demo Author","price":0}` | `400` for price below 1 | `A1-invalid-price.png` |
| `GET {{library}}/books/not-an-id` | — | `400` for an invalid ObjectId | `A1-invalid-id.png` |
| `DELETE {{library}}/books/{{bookId}}` | — | `200` with confirmation | `A1-delete.png` |
| `GET {{library}}/books/{{bookId}}` | — | `404` after deletion | `A1-not-found.png` |

**Before the DELETE request**, open MongoDB Compass and connect to `mongodb://127.0.0.1:27017`. Open `piet24cs111_library → books → Documents` and filter with `{"title":"Clean Code","price":449,"isAvailable":false}`. Capture the updated document as `A1-compass-books.png`. Capture the Library API terminal showing the method and URL entries as `A1-request-log.png`.

## 5. Capture the Student Portal screenshots

Set `portal` to `http://127.0.0.1:3001`. Use the following demo accounts. If they already exist, choose new email addresses for the new registration captures and use those same addresses for login.

```json
{"name":"Demo Student","email":"student11@example.com","password":"StudentDemo123!","role":"student"}
```

```json
{"name":"Demo Admin","email":"admin11@example.com","password":"AdminDemo123!","role":"admin"}
```

Send `Authorization: Bearer {{studentToken}}` for student requests and `Authorization: Bearer {{adminToken}}` for admin requests. Use the token from each login response. In a client's Bearer Token field, enter the variable without the `Bearer ` prefix. Store tokens and the admin key privately in your client. Mask token values and passwords in any screenshots you plan to publish. Keep the admin key out of the screenshot.

| Request | Body or authorization | Expected | Screenshot |
| --- | --- | --- | --- |
| `POST {{portal}}/register` | Student registration JSON above | `201` with student details | `A2-register.png` |
| `POST {{portal}}/register` | Admin registration JSON above plus `X-Admin-Registration-Key` | `201` with admin details | `A2-register-admin.png` |
| `POST {{portal}}/login` | `{"email":"student11@example.com","password":"StudentDemo123!"}` | `200` with `token`. Save it as `studentToken` | `A2-login.png` |
| `POST {{portal}}/login` | `{"email":"admin11@example.com","password":"AdminDemo123!"}` | `200` with `token`. Save it as `adminToken` | `A2-login-admin.png` |
| `GET {{portal}}/profile` | Student Bearer token | `200` with profile details and no password field | `A2-profile.png` |
| `GET {{portal}}/profile` | No Authorization header | `401` | `A2-profile-no-token.png` |
| `GET {{portal}}/profile` | `Authorization: Bearer invalid-token` | `401` | `A2-profile-invalid-token.png` |
| `GET {{portal}}/students` | Admin Bearer token | `200` with the student list | `A2.png` |
| `GET {{portal}}/students` | Student Bearer token | `403` | `A2-students-forbidden.png` |
| `POST {{portal}}/register` | Repeat the student registration JSON | `400` for duplicate email | `A2-duplicate.png` |
| `POST {{portal}}/register` | `{"name":"Invalid Demo","email":"invalid","password":"123"}` | `400` for invalid email and short password | `A2-invalid-registration.png` |

In Compass, open `piet24cs111_portal → students → Documents` and filter with `{"email":{"$in":["student11@example.com","admin11@example.com"]}}`. Capture the two demo documents and their roles as `A2-compass-students.png`. The `password` field stores a bcrypt hash. Mask the hash values in the screenshot. In `students → Indexes`, confirm the unique `email_1` index and save `A2-compass-email-index.png`.

The submission guideline asks for a public repository and a repository link in the instructor's Google Form. When preparing that submission, upload the app source, package files, `.env.example` files, screenshots and this README. Keep `.env` files and `node_modules/` outside the submission.

## Verification completed locally

All authored JavaScript files passed `node --check`. Both apps passed 40 HTTP checks against MongoDB Community Server 9.0.4 using temporary databases. The checks covered statuses `200`, `201`, `400`, `401`, `403`, `404` and `429`, as well as data persistence, concurrent duplicate registration, bcrypt hashes, one-hour JWTs, security headers, and request logging. Use the screenshot lists above to capture the evidence for submission.
