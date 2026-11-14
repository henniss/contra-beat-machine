# Hosting on AWS

The site is plain static files (about 160 KB), served at
**https://enniss.net/contra/**. The setup is written as Terraform, in
`infra/`:

- an **S3 bucket** holds the files, under `contra/`,
- **CloudFront** serves them over HTTPS on enniss.net,
- a free **certificate** from AWS Certificate Manager covers HTTPS,
- a **budget** emails harris@enniss.net if spending passes $5 a month.

DNS stays at Namecheap, so two records are added there by hand.

## Why CloudFront, for a site only a couple of people use

- **HTTPS is the real reason.** S3 alone can serve a custom domain only over
  plain `http://`, which browsers mark "Not secure" (some now warn before
  opening the page). CloudFront is the simple AWS way to get HTTPS.
- **Cost isn't a factor either way.** A visit is about 160 KB, so traffic for
  two people is effectively free on S3 or CloudFront. Both have permanent free
  allowances far beyond that.
- **Protection against someone running up the bill.** CloudFront caches the
  files and the bucket stays private, so nobody can hit S3 directly. On normal
  pay-per-use pricing, though, CloudFront doesn't cap anything by itself. AWS
  added flat-rate CloudFront plans in late 2025, including a **free plan**
  with built-in rate limiting and no overage charges. That makes the bill a
  fixed $0. Terraform can't subscribe to it yet, so that's one click in the
  console (step 7).
- The budget alert covers anything else.

**Recommendation:** S3 + CloudFront on the free flat-rate plan, set up with
the Terraform in `infra/`, plus the budget alert.

## What enniss.net has today

Looked up from public DNS before setting this up:

| Record | Value | Meaning |
|---|---|---|
| NS | `dns1/dns2.registrar-servers.com` | DNS is hosted at Namecheap |
| MX | `in1/in2-smtp.messagingengine.com` | Email goes to Fastmail |
| TXT | `v=spf1 include:spf.messagingengine.com ?all` | Fastmail's sender check |
| A, AAAA | none | No website on the bare domain |
| CAA | none | Amazon may issue the certificate |
| `www` | none | Nothing there either |

The site takes nothing away. Email records are separate from web records and
stay as they are.

## How the folder works

The files sit under `contra/` in the bucket, and CloudFront passes each
address straight to the object of the same name. Two extra objects cover the
awkward addresses:

- **`contra/`**: a second copy of `index.html`, so `enniss.net/contra/`
  serves the page. The S3 console shows this key as a folder; don't delete
  it there. Terraform would put it back on the next apply.
- **`contra`**: a tiny page that forwards `enniss.net/contra` (no slash) to
  `enniss.net/contra/`, keeping any tune link after the `#`.

The app only uses relative paths, which is what lets it live in a folder.
`test/paths.test.js` checks this.

The bare domain, `enniss.net/`, shows `infra/root/index.html`: a one-line
page linking to the beat machine. It's stored as `index.html` at the top of
the bucket, and the distribution's default root object points at it. Any
other address gets S3's "Access Denied" error.

To host something else on enniss.net, give it its own folder in the bucket
(with a `folder/` copy of its `index.html`, as for `contra/`) and add a link
to the root page. Terraform only manages the files it uploads itself, so it
won't touch other folders.

## First-time setup

1. [ ] **Install** Terraform and the AWS CLI:
       `brew install terraform awscli`.
2. [ ] **Credentials:** set them up however you like (`aws configure`,
       `AWS_PROFILE`, SSO). Check the right account is active with
       `aws sts get-caller-identity`.
3. [ ] **Initialise:** in `infra/`, run `terraform init`.
4. [ ] **Certificate first:**
       `terraform apply -target=aws_acm_certificate.site`

       This prints `certificate_validation_record`. In Namecheap, go to Domain
       List, then enniss.net, then Advanced DNS, and add a **CNAME Record**:
   - **Host:** the printed `host`. It's already shortened: Namecheap adds
     `.enniss.net` itself. Pasting the full name would make a record ending
     in `enniss.net.enniss.net`, and the certificate would never be issued.
   - **Value:** the printed `value`.

       Leave the record there for good. AWS uses it to renew the certificate
       automatically.
5. [ ] **Everything else:** `terraform plan`, then `terraform apply`. It
       waits until the certificate is issued, then creates the distribution
       (a few minutes) and uploads the files.
6. [ ] **Point the domain:** on the same Namecheap page, add an **ALIAS
       Record**:
   - **Host:** `@`
   - **Value:** the printed `cloudfront_domain`
   - **TTL:** automatic

       Leave the MX and TXT records for Fastmail alone.
7. [ ] **Free plan:** in the CloudFront console, open the distribution (its
       ID is the printed `distribution_id`) and choose the free flat-rate
       plan. The plan adds its own firewall rules to the distribution;
       Terraform is set to leave them alone. If a later `terraform plan`
       wants to change some other setting back, it's the plan's doing: add
       that setting to `ignore_changes` in `infra/cloudfront.tf`.

       Flat-rate plans aren't available on AWS's credit-based Free Tier
       accounts (the newer kind, from mid-2025). Upgrading the account to
       paid fixes that.
8. [ ] **Check it:**
   - Open `https://enniss.net/contra/` and press Play.
   - Turn on the instructor. If the voice counts, the audio files are
     served correctly.
   - Open `https://enniss.net/contra/#last-waltz/D-major/abc12` and check
     it plays that tune. The part after `#` never reaches the server.
   - Open `https://enniss.net/contra` (no slash): it should move to
     `/contra/` and play.
   - Open `https://enniss.net/contra#reel/D-major/abc12`: it should keep
     the tune.
   - Check the browser console for errors.
   - Check email to harris@enniss.net still arrives.

## Each time you update the site

- [ ] In `infra/`, run `terraform apply`. It uploads only the files that
      changed.

The free plan only allows AWS's managed cache policies, so CloudFront keeps
files for a day. To make up for that, whenever an apply changes any file it
also clears CloudFront's whole cache (`infra/invalidate.tf`). Visitors get the
new version within a few minutes. This runs the AWS CLI with the same
credentials as Terraform, so the CLI must be installed and see the same
profile. Clearing everything counts as one of the 1,000 free paths a month.

To clear the cache by hand:

```sh
aws cloudfront create-invalidation --distribution-id <distribution_id> --paths "/*"
```

A new kind of file (say `.svg`) makes `terraform plan` stop with an error
until its content type is added to the table in `infra/site.tf`. That's
deliberate: a wrong type on `.js` stops the app loading.

## Terraform state

Terraform records what it created in `infra/terraform.tfstate`, which git
ignores. Keep a copy somewhere safe. If it's lost, Terraform forgets the
bucket and distribution, and they'd have to be imported back.

## Taking it down

Run `terraform destroy` in `infra/`, then delete the two records (the CNAME
and the ALIAS) at Namecheap.

## Expected cost

$0 on the free flat-rate plan; pennies a month on pay-per-use pricing. The
certificate is free, and so are the first two budgets.
