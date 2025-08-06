# How I Caused a Denial of Service by Poisoning the Cache

### What is Web Cache Poisoning?
Web cache poisoning is a technique where an attacker exploits a web cache to serve a malicious or unintended response to other users. You can find a detailed explanation of this vulnerability on the [PortSwigger Web Security Academy](https://portswigger.net/web-security/web-cache-poisoning)

### How I found the vulnerability
I started hunting on this program and began by doing some recon.
Starting with Google Dorking, as it was a wide scope program, I used `site:*.redacted.com`.

I came across the subdomain `assets.redacted.com`.
Since this subdomain would contain important assets required to load sites on other subdomains, I thought I should take a look at it.

After crawling the subdomain and fetching archive URLs, I found a perfect cacheable candidate.
It was a JavaScript file: `/js/main.8e22e8.js`.

So, how did I know it was a perfect candidate?

It had the following response headers:

```
X-Cache: MISS
Cache-Control: max-age=3000, public
```

The `X-Cache: MISS` header tells us if the file is saved on the cache or being fetched from the origin. It also had a `max-age` header, which tells us how long the cache server will save it in seconds.

`MISS` means the cache server didn't have a copy of the file, so it will fetch that file from the origin server. This means the next request will be a `HIT`, as shown below:

```
X-Cache: HIT
```

I got this in the response header after sending the second request:

```
X-Cache: HIT
Age: 2
Cache-Control: max-age=3000, public
```

Now it was time to look for an unkeyed header. Unkeyed headers are headers that the cache server ignores, but the origin server responds to. After some further testing, I found an unkeyed header `X-HTTP-METHOD-OVERRIDE` using the Param-Miner Burp extension by James Kettle.

My payload was `X-HTTP-METHOD-OVERRIDE: HEAD`. This forced the server to return a response with no body, which was then successfully cached.

This means anyone requesting this particular asset will get a response with no Body until the cache expires. We have successfully poisoned the cache.
An attacker could automate the cache re-poisoning process by timing the script according to the cache's expiration interval.

**Note:** You must use a cache buster during the initial discovery and testing phase of your research. Its purpose is to keep your potentially disruptive tests isolated from the live cache that serves real users.

**REQUEST 1:**

```
GET /assets/js/main.8e22e8.js
Host: assets.redacted.com
X-HTTP-METHOD-OVERRIDE: HEAD
```

**RESPONSE 1:**

```
HTTP/2 200 OK
X-Cache: MISS
Cache-Control: max-age=3000, public

(No body returned)

```
To confirm the poison was successful, I sent a clean `GET` request, simulating a normal user's browser.

**REQUEST 2:**

```
GET /assets/js/main.8e22e8.js
Host: assets.redacted.com
```
**RESPONSE 2:**

```
HTTP/2 200 OK
X-Cache: HIT
Age: 2
Cache-Control: max-age=3000, public

(No body returned)
```

So, we have caused a Denial of Service (DoS) on this asset, which will likely break any site functionality that depends on it.

My report got accepted despite the program guidelines saying DoS was out of scope because this is different from a traditional DoS where we overwhelm and exhaust the server.

This is a misconfiguration. And many programs like HackerOne, Glassdoor, and PayPal have awarded bounties for cache poisoning DoS vulnerabilities.


### Further Reading

[Practical Web Cache Poisoning](https://portswigger.net/research/practical-web-cache-poisoning)