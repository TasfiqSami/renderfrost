<!-- Privacy Policy — RenderFrost SMP -->
Source: https://www.renderfrost.com/privacy
Last updated: 2026-11-21

Legal

# Privacy Policy.

Last updated 21 November 2026. This policy describes what the RenderFrost SMP
website actually does with data, based on how it is really built — not a
generic template.

## 1. Scope

This policy covers the RenderFrost SMP website you are reading now. It is an
informational website about a Minecraft server. It is separate from the
Minecraft server itself, and separate from the RenderFrost Discord server,
each of which handles data under its own terms and systems.

The Members page asks this site's own status service (/api/status) whether the
server is online and, if enabled, who is online and whitelisted. That service
talks to the game server's control panel; no visitor information is sent to
it or stored. The website is otherwise a static site: it has no user accounts, no login, no payment
processing, no private messaging, and no database of visitors. Nothing you do
here creates a profile about you.

## 2. Information from normal browsing

Like any website, loading these pages means your browser sends a request to
the host that serves the files. That request necessarily involves technical
details such as your IP address, browser type, and the time of the request.
This website itself does not record, store, or process any of it.

No analytics script runs on these pages, no advertising tracker is loaded, and
no fingerprinting code is included.

## 3. Hosting and server logs

Whoever hosts these files may keep standard web server logs as part of
ordinary operation, and may retain them for their own security and diagnostic
purposes. The exact log format and retention period depend on the hosting
provider, and are not something this project controls or can verify from the
source code.

We have deliberately not stated a specific retention period here, because
inventing one would be misleading. If you need that detail, it is a fair
question for the hosting provider currently in use.

## 4. Cookies and browser storage

This website sets no cookies and uses no tracking or advertising storage.

It does use your browser's `localStorage` for one purpose: to
remember your soundtrack preference — the volume level you chose and whether
you muted it. That value stays in your browser, is never transmitted to us,
and is not linked to any identity. See section 5.

## 5. Music preferences and local UI settings

The soundtrack control stores a small JSON value in `localStorage`
under the key `rf.music`, containing a number between 0 and 1 for
volume and a true/false mute flag. Nothing else about you is stored.

You can clear it at any time through your browser's site data settings, which
resets the soundtrack to its default level. If your browser blocks storage,
the site still works — the preference simply is not remembered between
visits.

Audio does not start on its own. The soundtrack only plays after you press
play, and it is loaded from a file hosted with this website rather than from a
third-party streaming service.

## 6. Clipboard use

The **Copy IP** buttons copy the server address
`play.renderfrost.com` to your clipboard, and the Discord page can
copy the invite link. That is the only thing they copy.

This requires your permission in the browser. If clipboard access is refused
or unavailable, the site tells you the copy did not succeed and asks you to
select the text manually. The website never reads your clipboard, and it
never attempts to read or transmit anything already stored there.

## 7. External links and Discord

Links that leave this website, including the Discord invite at
`discord.gg/SMRS6skKYY`, open in a new tab and are marked so you
know you are leaving. External links use `rel="noopener noreferrer"`
so the destination cannot access the page you came from.

Once you are on Discord or any other external service, that service's own
privacy policy and data practices apply. We do not control them, and this
policy cannot describe what they collect.

## 8. Analytics and third-party scripts

There are none. The website loads no analytics service, no social widgets, no
advertising network, and no third-party JavaScript. Fonts are served from the
same host as the pages rather than from an external font service, so loading
a page does not tell a third party that you visited. The one exception is the
Gallery page, which displays community screenshots hosted on Discord's
content network (cdn.discordapp.com); loading that page makes your browser
request those images from Discord, which can see your IP address under its
own policies.

## 9. Forms and personal information

This website has no forms that collect personal information. There is no
contact form, no signup, and no field that submits anything anywhere.

To request whitelist access, report an incident, or ask about a rollback, you
contact the RenderFrost staff team directly through Discord. Information you
share there is handled by that platform and by the staff team, not by this
website.

## 10. Purpose and retention

The only data this website handles for its own purposes is the single
soundtrack preference described in section 5, kept so the volume you chose
survives a page change or a return visit. It stays until you clear it or your
browser evicts it.

Because the site has no backend and no database, there is no visitor record to
retain, export, or delete.

## 11. Sharing and service providers

We do not sell, share, or transfer visitor data, because this website does not
collect any in the first place.

The only third party involved in serving the site is the hosting provider that
delivers the files. Hosting a website necessarily means that provider's
systems handle your requests, and its own policies govern its logs.

## 12. Security and its limits

The site is built to avoid introducing risk rather than to claim perfect
security. In practice that means: no data collection to leak, no credentials
or tokens in the code, no unsafe injection of external content, and safe
handling of links that open in new tabs.

Recommended deployment headers — a content security policy, frame
restrictions, referrer policy and content-type protections — are
documented for whoever deploys the site. Whether they are actually active
depends on the host, and this policy does not claim they are in place if only
the source code has been changed.

Data held in `localStorage` is readable by anything running in the
page's origin, which is why it holds nothing more sensitive than a volume
number.

## 13. Your choices and rights

You can clear the stored soundtrack preference at any time in your browser
settings, refuse clipboard permission without losing any functionality, and
choose never to press play on the soundtrack. None of those choices break
anything.

Depending on where you live, you may have legal rights over personal data &
requests to access, correct or delete it. Because this website holds no
personal data, there is generally nothing here to act on. Requests relating to
your Minecraft account, whitelist status, or anything on the Discord server
should go to the staff team through Discord.

## 14. Children’s privacy

Minecraft is played by people of many ages. This website does not knowingly
collect personal information from anyone, including children, because it does
not collect personal information at all. Access to the server itself is
governed by staff verification.

## 15. Changes to this policy

If the website changes in a way that affects privacy — for example if
analytics or a form is ever added — this policy will be updated to
describe it accurately, and the date at the top will change. We will not
describe practices the site does not have.

## 16. Contact

Questions about this policy, or about the website's behaviour, can be raised
with the RenderFrost staff team in Discord. We have deliberately not listed an
email address here, because no monitored address for this project could be
verified.

**In short:** no accounts, no analytics, no cookies, no tracking.
One volume setting saved in your own browser, and clipboard access used only
when you ask to copy the server address.

See also the [Terms of Service](https://www.renderfrost.com/terms), which covers use of
the website and the separate rules that apply to playing on the server.
