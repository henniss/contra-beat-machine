# Hosting on AWS

The site is plain static files (about 160 KB), so hosting is simple:

- an **S3 bucket** holds the files,
- **CloudFront** serves them over HTTPS on your own domain,
- a free **certificate** from AWS Certificate Manager covers HTTPS,
- a **DNS record** points the domain at CloudFront.

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
  fixed $0. Check the current terms when you set it up.
- Whatever you choose, set a **budget alert** (step 7).

Alternatives, if AWS isn't a requirement: GitHub Pages, Cloudflare Pages and
Netlify all host static sites for free with HTTPS and a custom domain, and
can't bill you for traffic.

**Recommendation:** S3 + CloudFront on the free flat-rate plan, plus a budget
alert.

## Checklist

### 1. Bucket
- [ ] Create an S3 bucket (any name, e.g. `contra-beat-machine-site`), in any
      region.
- [ ] Leave **Block all public access** on. Don't turn on "static website
      hosting". Only CloudFront will read the bucket.

### 2. Upload only the site files
- [ ] Upload `index.html`, `css/`, `js/` and `assets/`. Leave out `test/`,
      `scripts/`, the Markdown files and `package.json`:
  ```sh
  aws s3 sync . s3://YOUR-BUCKET --delete \
    --exclude "*" --include "index.html" --include "css/*" --include "js/*" --include "assets/*"
  ```
- [ ] Check that the `.js` files are stored with type `text/javascript`.
      Browsers refuse to load the app's scripts otherwise. `aws s3 sync` sets
      types from file extensions, so this is normally fine. Drag-and-drop in
      the console sometimes gets it wrong.

### 3. Certificate
- [ ] In AWS Certificate Manager, switch to the **us-east-1** region
      (CloudFront only accepts certificates from there).
- [ ] Request a public certificate for `yourdomain.com` and/or
      `www.yourdomain.com`.
- [ ] Add the DNS record it shows you to prove you own the domain, and wait
      for "Issued".

### 4. CloudFront
- [ ] Create a distribution with the bucket as its origin.
- [ ] For origin access, choose **Origin access control**, then apply the
      bucket policy it offers to add for you.
- [ ] Set viewer protocol to **Redirect HTTP to HTTPS**.
- [ ] Set **Default root object** to `index.html`.
- [ ] Under alternate domain names, add your domain(s) and pick the
      certificate from step 3.
- [ ] Use the default caching policy. Choose the free flat-rate plan if it's
      offered; otherwise pick the cheapest price class.

### 5. DNS
- [ ] **Domain in Route 53:** create an **A record (Alias)** pointing to the
      distribution.
- [ ] **Domain elsewhere:** create a CNAME from `www` to the
      `dxxxx.cloudfront.net` address. Most registrars don't allow a CNAME on
      the bare domain, so either use `www` or move the domain's DNS to
      Route 53.

### 6. Check it
- [ ] Open `https://yourdomain.com` and press Play.
- [ ] Turn on the instructor. If the voice counts, the audio files are being
      served correctly.
- [ ] Open a tune link (e.g. `https://yourdomain.com/#last-waltz/D-major/abc12`)
      and check that it plays that tune. The part after `#` never reaches the
      server, so no extra setup is needed for links.
- [ ] Check the browser console for errors.

### 7. Budget alert
- [ ] In AWS Budgets, create a monthly cost budget (e.g. $5) that emails you
      when spending goes over it.

## Each time you update the site

- [ ] Run the same `aws s3 sync` command from step 2.
- [ ] Clear CloudFront's cache, or visitors may see the old version for up to
      a day:
  ```sh
  aws cloudfront create-invalidation --distribution-id EXXXX --paths "/*"
  ```

## Expected cost

For a hobby site, expect pennies to a dollar or so a month on pay-per-use
pricing, or $0 on the free flat-rate plan. The certificate is free. Route 53
adds $0.50 a month if you use it for DNS.
