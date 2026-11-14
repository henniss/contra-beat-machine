# Hosting plan: Terraform for AWS

This plan turns the checklist in `aws.md` into Terraform code, so the whole
setup can be read, planned and applied in one place. You supply the
credentials and run `terraform plan` and `terraform apply` yourself. Nothing
here is implemented yet.

The previous plan (the review and clean-up, now finished) is kept as
`review-plan.md`.

## 1. What we're building

The site will live at **https://enniss.net/contra/**. A tune link looks like
`https://enniss.net/contra/#last-waltz/D-major/abc12`.

### What enniss.net has today

I looked up the domain's public DNS records:

| Record | Value | Meaning |
|---|---|---|
| NS | `dns1/dns2.registrar-servers.com` | DNS is hosted at **Namecheap** |
| MX | `in1/in2-smtp.messagingengine.com` | Email goes to **Fastmail** |
| TXT | `v=spf1 include:spf.messagingengine.com ?all` | Fastmail's sender check |
| A, AAAA | none | **No website** on the bare domain |
| CAA | none | Any certificate authority may issue, Amazon included |
| `www` | none | Nothing there either |

What this means for the plan:

- **Nothing is displaced.** The bare domain serves no website, so pointing it
  at CloudFront takes nothing away.
- **Email is unaffected.** The MX and TXT records are separate from the web
  records and stay as they are. So do any Fastmail signing records, which
  live on their own subdomains.
- **No CAA problem.** The certificate can be issued.
- **Namecheap can point the bare domain at CloudFront.** It supports an
  **ALIAS record** on `@`, which a plain CNAME can't do.

DNS stays at Namecheap. Terraform can't write records there, so two DNS steps
are done by hand. Terraform prints exactly what to add.

### The pieces

The pieces are the same as in `aws.md`:

| `aws.md` step | Terraform does | You do |
|---|---|---|
| 1. Bucket | Creates a private S3 bucket with all public access blocked | — |
| 2. Upload | Uploads `index.html`, `css/`, `js/`, `assets/` under the `contra/` folder, each with the right content type | — |
| 3. Certificate | Requests the certificate for enniss.net and waits for it to be issued | Add one CNAME record at Namecheap |
| 4. CloudFront | Creates the distribution, origin access control, bucket policy and a short-lived cache policy | Subscribe the distribution to the free flat-rate plan in the console (see §4.6) |
| 5. DNS | Prints the CloudFront address | Add an ALIAS record at Namecheap |
| 6. Check it | — | Open the site and try it |
| 7. Budget alert | Creates a $5 monthly budget that emails harris@enniss.net | — |

**Updating the site later** becomes `terraform apply`. It uploads only the
files that changed (see §2.5).

## 2. Approach

### 2.1 Layout

All Terraform goes in a new `infra/` folder, so it stays apart from the site
files and from `node --test`. Run every command from inside `infra/`.

The site files stay where they are. Terraform reads them from the folder
above (`path.module/..`), so there's no copy step.

### 2.2 One region

Everything goes in **us-east-1**. CloudFront only accepts certificates from
that region, and the budget is global anyway. Putting the bucket there too
means a single provider block with no aliases. The bucket's region has no
effect on visitors, since they're served by CloudFront.

### 2.3 Serving from `/contra/`: just files in the bucket

The site's files sit under `contra/` in the bucket, and CloudFront passes
each address straight through to the object with the same name. So
`enniss.net/contra/js/main.js` is the object `contra/js/main.js`. No code
runs on CloudFront.

The app already works from a subfolder. Every path in it is relative:

- `css/style.css` and `js/main.js` in `index.html`;
- the module imports;
- the voice clips, which are built from `import.meta.url` in `instructor.js`.

Tune links live after the `#` and use `history.replaceState` with only the
hash, so they never touch the path.

Only two addresses need care, and each is handled by uploading one extra
object.

- **`enniss.net/contra/`, the address people use.** S3 has no idea that a
  folder should show its `index.html`, and CloudFront only does that for the
  bare root. But an S3 key may end in a slash, so `index.html` is uploaded a
  second time under the key **`contra/`**. A request for `/contra/` then gets
  the page directly. The same file is also kept at `contra/index.html`.
- **`enniss.net/contra`, without the slash.** The app's relative paths would
  resolve against the domain root here (`enniss.net/css/style.css`) and
  break. So the key **`contra`** holds a three-line page that forwards the
  browser to `contra/`. It uses `location.replace('contra/' + location.hash)`,
  so a tune link typed without the slash still opens its tune. A plain link
  is the fallback. The page is written inline in the Terraform code, with
  `content = ...`, so it isn't a separate file.

Every other address, including the bare `enniss.net/`, reaches the private
bucket and gets S3's "Access Denied" error. That's acceptable while nothing
else lives on the domain. A root page can be added later if wanted.

### 2.4 Uploading files with Terraform

Each site file becomes an `aws_s3_object`, chosen with `fileset()`:

- `index.html`
- `css/**`, `js/**`, `assets/**`

Anything whose name starts with a dot is skipped, such as `.DS_Store`.

- **Key:** `contra/<path>`, plus the two extra keys from §2.3.
- **Content type:** looked up from the extension in a fixed table:

  | Extension | Content type |
  |---|---|
  | `.html` | `text/html; charset=utf-8` |
  | `.css` | `text/css; charset=utf-8` |
  | `.js` | `text/javascript; charset=utf-8` |
  | `.ogg` | `audio/ogg` |
  | `.m4a` | `audio/mp4` |

  The extra keys `contra/` and `contra` have no extension, so they're given
  `text/html; charset=utf-8` explicitly.

  The lookup has **no default**. A new kind of file (say `.svg`) makes
  `terraform plan` fail with a clear error rather than upload with a wrong
  type. A wrong type on `.js` is exactly the failure `aws.md` warns about.
- **Change detection:** `etag = filemd5(...)`. A file is re-uploaded only when
  its contents change.

### 2.5 Caching

The file names have no version numbers in them. With CloudFront's default
caching (24 hours), visitors would keep old JavaScript for up to a day after
an update.

A custom **cache policy** keeps files for **5 minutes** by default and at
most 1 hour. Five minutes after `terraform apply`, everyone has the new
version, with no extra step. If you want a change live immediately, clearing
the cache is one AWS CLI command. `aws.md` will list it as optional.

The cost is irrelevant: a visit is about 25 requests, and the free plan
allows a million a month. The policy ignores cookies, headers and query
strings, and turns on gzip and Brotli compression.

### 2.6 State

Terraform keeps its state in a local file, `infra/terraform.tfstate`. The file
is ignored by git. It contains nothing secret here (no passwords or keys),
but it's tied to your account, and a remote backend is overkill for a
one-person setup.

The lock file (`.terraform.lock.hcl`) **is** committed, so provider versions
stay fixed between runs.

### 2.7 Budget email

Budget alerts go to **harris@enniss.net**. It's set in a committed
`infra/terraform.tfvars`, so there's nothing to fill in before the first run.
It's kept out of the `.tf` files so that changing it doesn't mean touching
code.

## 3. No data model changes

The app's state, tune links and file formats are unchanged. The only
new "schema" is the set of Terraform variables:

| Variable | Default | Meaning |
|---|---|---|
| `domain_name` | `"enniss.net"` | The domain on the certificate and the distribution |
| `site_path` | `"contra"` | The folder the site is served from |
| `budget_email` | none (set in `terraform.tfvars`) | Where budget alerts go |
| `budget_limit_usd` | `5` | Monthly budget |

Outputs:

| Output | Used for |
|---|---|
| `certificate_validation_record` | Host, type and value of the CNAME to add at Namecheap (step 3), with the host already shortened to the form Namecheap wants (see §5) |
| `cloudfront_domain` | The `dxxxx.cloudfront.net` address for the ALIAS record (step 5) |
| `distribution_id` | Finding the distribution in the console for the free plan (§4.6), and the optional cache-clearing command |
| `site_url` | `https://enniss.net/contra/` |

## 4. Resources, in detail

### 4.1 Bucket

- An `aws_s3_bucket` named with the prefix `enniss-net-site-`. AWS adds a
  random suffix, since bucket names are global.
- An `aws_s3_bucket_public_access_block` with all four settings on.
- An `aws_s3_bucket_ownership_controls` set to "bucket owner enforced", which
  turns access lists off.
- Encryption: S3's default is enough.
- No versioning and no static website hosting.
- An `aws_s3_bucket_policy` that lets the CloudFront service read objects
  (`s3:GetObject`) only when the request comes from **this** distribution
  (a condition on `AWS:SourceArn`). This is the policy the console offers to
  add in step 4 of `aws.md`.

### 4.2 Certificate

- `aws_acm_certificate` for `enniss.net` with DNS validation.
- `aws_acm_certificate_validation`, which makes `terraform apply` wait until
  the certificate is issued. It waits up to 75 minutes by default, which is
  plenty once the record is in place.

### 4.3 CloudFront

- `aws_cloudfront_origin_access_control` (S3, always sign, SigV4).
- `aws_cloudfront_cache_policy` as in §2.5.
- `aws_cloudfront_distribution`:
  - one origin: the bucket's regional address, with the access control above;
  - the alternate name `enniss.net`;
  - the validated certificate, SNI only, minimum TLS 1.2 (2021 policy);
  - one default behaviour:
    - GET and HEAD only;
    - redirect HTTP to HTTPS;
    - compression on;
    - the cache policy above;
  - IPv6 on, HTTP/2 and HTTP/3;
  - price class 100 (North America and Europe), the cheapest;
  - no default root object, since nothing lives at `/`;
  - `lifecycle { ignore_changes = [web_acl_id] }`, so subscribing to the free
    plan (§4.6) doesn't make the next `terraform apply` undo it.

### 4.4 Budget

An `aws_budgets_budget`: monthly, cost, $5. It emails `budget_email` when
actual spending passes 80% and when forecast spending passes 100%. The first
two budgets in an account are free.

### 4.5 Site files

As in §2.3 and §2.4. The objects depend on the bucket only, so the first
apply can upload while the certificate is still waiting.

### 4.6 The free flat-rate plan: done by hand

AWS's free CloudFront plan makes the bill a fixed $0 and adds rate limiting
(1 million requests and 100 GB a month). Terraform has no resource for it.
AWS added an API and a CloudFormation resource for these plans in September
2026, but the Terraform provider hadn't followed when I checked. So the plan
is:

1. Apply everything with Terraform, on normal pay-per-use pricing.
2. In the CloudFront console, open the distribution and choose the free plan.

The plan attaches its own firewall rules (a web ACL) to the distribution.
That's why Terraform is told to ignore that setting (§4.3).

**Rejected:** wrapping the CloudFormation resource in an
`aws_cloudformation_stack`. It would be fully automated, but it's a second
tool inside Terraform for a one-time click, and I couldn't verify how it
behaves.

**To check while implementing:** whether the plan also changes the price
class or other settings on the distribution. If it does, add them to
`ignore_changes` too.

## 5. Running it (what goes in `aws.md`)

1. **Install:** Terraform and the AWS CLI (`brew install terraform awscli`).
2. **Credentials:** set them up however you like (`aws configure`,
   `AWS_PROFILE`, SSO). The code doesn't name a profile. `aws sts
   get-caller-identity` confirms the right account is active.
3. **First run:** in `infra/`, `terraform init`.
4. **Certificate first:**
   `terraform apply -target=aws_acm_certificate.site`

   This prints `certificate_validation_record`. In Namecheap, go to Domain
   List, then enniss.net, then Advanced DNS, and add a **CNAME Record**:
   - **Host:** the printed host. It's ACM's record name with
     `.enniss.net.` removed from the end, because Namecheap adds the domain
     itself. Pasting the full name would create a record ending in
     `enniss.net.enniss.net`, and the certificate would never be issued.
   - **Value:** the printed value.

   The record can stay there forever. ACM uses it to renew the certificate
   automatically.
5. **Everything else:** `terraform plan`, then `terraform apply`. It waits
   until the certificate is issued, then creates the distribution (which takes
   a few minutes) and uploads the files.
6. **Point the domain:** in the same Namecheap page, add an **ALIAS Record**:
   - **Host:** `@`
   - **Value:** `cloudfront_domain`
   - **TTL:** automatic

   Leave the MX and TXT records for Fastmail alone.
7. **Free plan:** as in §4.6.
8. **Check it:** the existing step 6 of `aws.md`, with the new addresses. Also
   check these:
   - `https://enniss.net/contra` (no slash) forwards to `/contra/` and plays;
   - `https://enniss.net/contra#reel/D-major/abc12` keeps the tune;
   - email to harris@enniss.net still arrives.

**Each time you update the site:** `terraform apply`. Changes show up within
5 minutes, or at once after the optional
`aws cloudfront create-invalidation --distribution-id <distribution_id> --paths "/*"`.

**To take it all down:** `terraform destroy`. The two Namecheap records must
be removed by hand.

## 6. Risks and dependencies

1. **Namecheap's ALIAS record and IPv6.** Namecheap's ALIAS gives out IPv4
   addresses. The distribution has IPv6 turned on, but visitors may reach it
   over IPv4 only. That makes no practical difference.
2. **The `contra/` key looks odd in the S3 console.** The console shows a key
   ending in a slash as a folder. Deleting that "folder" by hand in the
   console would delete the page served at `/contra/`. Terraform puts it back
   on the next apply.
3. **Free Tier accounts can't use flat-rate plans.** This applies to accounts
   on AWS's newer "free plan" (the credit-based one from mid-2025). Upgrading
   to a paid account fixes it, and the budget alert still applies.
4. **Lost state.** If `terraform.tfstate` is deleted, Terraform forgets what
   it made. Re-running would try to create duplicates, and the bucket and
   distribution would clash. Keep a copy somewhere safe (it's small), or
   import the resources back.
5. **Checking the code before handing it over.** Once Terraform is installed,
   I'll run `terraform fmt -check`, `terraform init` and `terraform validate`.
   They need network access to download the provider but no credentials.
   Running `plan` and `apply` stays with you.
6. **Provider version.** The code will pin the AWS provider to `~> 6.0` and
   Terraform to `>= 1.10`. I'll check the newest versions when implementing.

## 7. Alternatives rejected

- **A CloudFront Function to rewrite `/contra/` to `/contra/index.html`.**
  It's the usual answer, but it means code running on every request, and a
  separate test, for something two extra S3 objects handle.
- **S3 website hosting.** It handles folder `index.html` files natively, but
  it needs a public bucket and only talks plain HTTP to CloudFront.
- **Uploading with `aws s3 sync`.** It would be one more command on every
  update, when Terraform already knows which files changed. It's worth
  revisiting only if the site grows to many files or large media.
- **Default 24-hour caching plus clearing the cache on every update.** It
  would also be one more command each time. The 5-minute cache needs none,
  and clearing stays available when you want a change live at once.
- **A subdomain (`contra.enniss.net`).** It would avoid the two extra
  objects, but you asked for the path.
- **A remote state backend (S3 bucket with locking).** It's chicken-and-egg
  for the first run, and pointless for one person.
- **A `www.enniss.net` redirect.** Not asked for. It's easy to add later: a
  second name on the certificate and the distribution, and one more record at
  Namecheap.
- **Security headers (HSTS, content security policy).** The site has no
  logins, cookies or user data. HSTS on the bare domain would also bind any
  future use of enniss.net to HTTPS for a year.
- **Terraform modules from the registry** (for example a "static site" module).
  They hide what's created, and the whole thing is about 150 lines of plain
  resources.

## 8. Files

### New

- **`infra/versions.tf`:** the `terraform` block (required version, AWS
  provider pin) and the `provider "aws"` block (us-east-1, default tags
  `project = "contra-beat-machine"` so everything is findable in the
  console).
- **`infra/variables.tf`:** the four variables in §3, with descriptions.
  `budget_email` gets a simple format check.
- **`infra/terraform.tfvars`:** `budget_email = "harris@enniss.net"`.
- **`infra/site.tf`:**
  - the bucket, public access block, ownership controls and bucket policy
    (§4.1);
  - the content type table and the `aws_s3_object` set, including the
    `contra/` copy of `index.html` and the inline forwarding page at
    `contra` (§2.3, §2.4).
- **`infra/certificate.tf`:** the certificate and its validation (§4.2).
- **`infra/cloudfront.tf`:** the origin access control, cache policy and
  distribution (§4.3).
- **`infra/budget.tf`:** the budget (§4.4).
- **`infra/outputs.tf`:** the outputs in §3.
- **`.gitignore`:** `infra/.terraform/`, `infra/terraform.tfstate*`,
  `infra/*.tfplan`, `.DS_Store`.
- **`test/paths.test.js`:** checks that `index.html`, the CSS and every
  module use only relative paths. It looks for `href="/`, `src="/`,
  `url(/` and imports starting with `/`. Serving from `/contra/` depends on
  this, and it's the one way a future change could break hosting without
  touching `infra/`.

### Changed

- **`aws.md`:**
  - keep the "Why CloudFront" section, updated: the recommendation now
    names Terraform;
  - add the "What enniss.net has today" findings from §1;
  - replace the click-through checklist with the steps in §5, including the
    Namecheap details;
  - update the update and cost sections; the example link becomes
    `https://enniss.net/contra/#last-waltz/D-major/abc12`.
- **`README.md`:**
  - the paragraph naming `original-plan.md` and `plan.md` also names
    `review-plan.md`;
  - one line saying hosting is in `aws.md` and the code in `infra/`.
- **`CODE.md`:**
  - the intro line about plans (as for the README);
  - the file map gains `infra/`, `.gitignore` and the new test;
  - the hosting note (line 31) points at `infra/`;
  - the content type note (line 472) says Terraform sets types from a table
    and fails on unknown extensions;
  - one paragraph on why the app must stay path-relative: an absolute
    `/js/...` path would break under `/contra/`. The new test enforces it.

### Unchanged

The app itself (`index.html`, `css/`, `js/`, `assets/`) needs no changes.
`package.json` needs none either: `node --test test/` picks up the new test
automatically.

## Deviations and notes from implementation

- **Versions:** Terraform 1.17.2 is installed; the newest AWS provider is
  6.73.0. The pins stay as planned (`>= 1.10`, `~> 6.0`), and the committed
  lock file holds the exact provider version.
- **Free plan settings (§4.6):** this can't be checked without an AWS
  account, so it moved into `aws.md` step 7. If a `terraform plan` after
  subscribing wants to change a setting back, add that setting to
  `ignore_changes`.
- **Unknown file types:** confirmed with a temporary `.svg`. The plan stops
  with Terraform's "Invalid index" error, which is less descriptive than
  hoped. `aws.md` explains what it means.
- **`certificate_validation_record`** is a list with one entry, the shape
  Terraform gives for certificate validation.
- **After launch:** the free flat-rate plan refused the custom 5-minute
  cache policy. The distribution now uses AWS's managed "CachingOptimized"
  policy (1 day), and `infra/invalidate.tf` clears the whole cache whenever
  an apply changes a file. A bare-bones root page, `infra/root/index.html`,
  now links to `contra/` from `enniss.net/`, through the distribution's
  default root object.

## Todo

### Phase 1: Groundwork

- [x] Check whether Terraform is installed. If not, note that `fmt`, `init` and `validate` wait until it is.
- [x] Look up the current AWS provider and Terraform versions, and settle the pins (§6, risk 6).
- [x] Add `.gitignore` with `infra/.terraform/`, `infra/terraform.tfstate*`, `infra/*.tfplan` and `.DS_Store`.

### Phase 2: Terraform basics

- [x] `infra/versions.tf`: the `terraform` block with the required version and provider pin.
- [x] `infra/versions.tf`: the `provider "aws"` block with us-east-1 and the default `project` tag.
- [x] `infra/variables.tf`: the variables `domain_name`, `site_path`, `budget_email` (with a format check) and `budget_limit_usd`, each with a description.
- [x] `infra/terraform.tfvars`: `budget_email = "harris@enniss.net"`.

### Phase 3: Bucket and site files

- [x] `infra/site.tf`: the bucket with the `enniss-net-site-` prefix.
- [x] `infra/site.tf`: the public access block (all four on) and ownership controls (bucket owner enforced).
- [x] `infra/site.tf`: the content type table, keyed by extension, with no default.
- [x] `infra/site.tf`: build the file list with `fileset()` over `index.html`, `css/**`, `js/**` and `assets/**`, skipping names that start with a dot.
- [x] `infra/site.tf`: one `aws_s3_object` per file at `contra/<path>`, with the content type and `etag = filemd5(...)`.
- [x] `infra/site.tf`: the second copy of `index.html` under the key `contra/`, typed `text/html; charset=utf-8`.
- [x] `infra/site.tf`: the inline forwarding page under the key `contra`, using `location.replace('contra/' + location.hash)` plus a plain link.
- [x] Use `site_path` everywhere the folder name appears, rather than a literal `contra`.

### Phase 4: Certificate

- [x] `infra/certificate.tf`: `aws_acm_certificate.site` for `domain_name`, with DNS validation and `create_before_destroy`.
- [x] `infra/certificate.tf`: `aws_acm_certificate_validation` using the certificate's validation record name.

### Phase 5: CloudFront

- [x] `infra/cloudfront.tf`: the origin access control (S3, always sign, SigV4).
- [x] `infra/cloudfront.tf`: the cache policy (min 0, default 300, max 3600 seconds; no cookies, headers or query strings; gzip and Brotli on).
- [x] `infra/cloudfront.tf`: the distribution's origin, alias and certificate settings (SNI, TLS 1.2 2021 policy).
- [x] `infra/cloudfront.tf`: the default behaviour (GET and HEAD, redirect to HTTPS, compression, the cache policy), plus IPv6, HTTP/2 and HTTP/3, price class 100, no default root object and no geographic restrictions.
- [x] `infra/cloudfront.tf`: `lifecycle { ignore_changes = [web_acl_id] }`, with a one-line comment on why (the free plan attaches it).
- [x] `infra/site.tf`: the bucket policy allowing `s3:GetObject` for the CloudFront service, limited by `AWS:SourceArn` to this distribution.

### Phase 6: Budget and outputs

- [x] `infra/budget.tf`: monthly cost budget at `budget_limit_usd`, emailing at 80% actual and 100% forecast.
- [x] `infra/outputs.tf`: `certificate_validation_record`, with the host shortened by stripping `.<domain_name>.` for Namecheap.
- [x] `infra/outputs.tf`: `cloudfront_domain`, `distribution_id` and `site_url`.

### Phase 7: Checks

- [x] `test/paths.test.js`: fail on `href="/`, `src="/`, `url(/` or imports starting with `/` in `index.html`, `css/` and `js/`.
- [x] Run `npm test` and confirm every suite passes.
- [x] Run `terraform fmt -check`, `terraform init` and `terraform validate` in `infra/` (needs Terraform; no credentials).
- [x] Check that the `fileset()` result lists exactly the site files and the content type lookup covers them (e.g. with `terraform console`, if available).
- [x] Commit `infra/.terraform.lock.hcl` if `init` produced one.
- [x] Look into whether subscribing to the free plan changes settings other than the web ACL. If so, add them to `ignore_changes` (§4.6).

### Phase 8: Documents

- [x] `aws.md`: update "Why CloudFront" so the recommendation names Terraform.
- [x] `aws.md`: add "What enniss.net has today".
- [x] `aws.md`: replace the checklist with the steps in §5, including the Namecheap details and the post-launch checks.
- [x] `aws.md`: update the "Each time you update the site", tear-down and cost sections, and the example link.
- [x] `README.md`: mention `review-plan.md`, and add the line about `aws.md` and `infra/`.
- [x] `CODE.md`: the intro line about plans, the file map, the hosting note and the content type note.
- [x] `CODE.md`: the paragraph on staying path-relative and the test that enforces it.
- [x] Note any deviations from this plan in the relevant section above.
