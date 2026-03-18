/**
 * Disposable / Temporary Email Domain Blocklist
 * 
 * SECURITY: Blocks registration and password-reset requests from known
 * throwaway email providers. This prevents abuse by bots and users
 * circumventing verification with temporary inboxes.
 */

const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  // Major disposable services
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamail.de', 'grr.la', 'guerrillamailblock.com', 'tempmail.com',
  'temp-mail.org', 'temp-mail.io', 'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'throwaway.email', 'throwaway.email', 'dispostable.com', 'sharklasers.com',
  'guerrillamail.info', 'spam4.me', 'trashmail.com', 'trashmail.me',
  'trashmail.net', 'trashmail.org', 'trashmail.at', 'trashmail.io',

  // 10-minute / temporary
  '10minutemail.com', '10minutemail.net', '10minutemail.org', '10minutemail.co.za',
  'minutemail.com', '20minutemail.com', '20minutemail.it', 'tempail.com',
  'tempr.email', 'tempmailo.com', 'tempmailaddress.com',

  // Fake / burner email
  'fakeinbox.com', 'fakemail.net', 'fakemailgenerator.com', 'emailfake.com',
  'crazymailing.com', 'maildrop.cc', 'mailnesia.com', 'mailcatch.com',
  'mailsac.com', 'mailslurp.com', 'inboxkitten.com',

  // Getnada / nada
  'getnada.com', 'nada.email', 'nada.ltd',

  // Mohmal
  'mohmal.com', 'mohmal.im', 'mohmal.in', 'mohmal.tech',

  // Harakiri
  'harakirimail.com',

  // MailTemp
  'mailtemp.info', 'mailtemp.net',

  // Burner mail
  'burnermail.io', 'burnermailprovider.com',

  // Disposable domain services
  'disposableemailaddresses.emailmiser.com', 'discard.email', 'discardmail.com',
  'discardmail.de', 'emailondeck.com',

  // Other known disposable
  'anonbox.net', 'anonymbox.com', 'antichef.com', 'antichef.net',
  'binkmail.com', 'bobmail.info', 'bofthew.com', 'brefmail.com',
  'bugmenot.com', 'bumpymail.com', 'casualdx.com', 'chogmail.com',
  'cool.fr.nf', 'correo.blogos.net', 'cosmorph.com', 'courriel.fr.nf',
  'courrieltemporaire.com', 'cubiclink.com', 'curryworld.de',
  'dayrep.com', 'deadaddress.com', 'despammed.com', 'devnullmail.com',
  'dfgh.net', 'digitalsanctuary.com', 'dingbone.com', 'disposableaddress.com',
  'disposeamail.com', 'disposemail.com', 'dodgeit.com', 'dodgit.com',
  'donemail.ru', 'dontreg.com', 'dontsendmespam.de', 'drdrb.com',
  'dump-email.info', 'dumpanime.com', 'dumpyemail.com', 'e4ward.com',
  'easytrashmail.com', 'einrot.com', 'emailigo.de', 'emailisvalid.com',
  'emailsensei.com', 'emailtemporario.com.br', 'emailthe.net', 'emailtmp.com',
  'emailwarden.com', 'emailx.at.hm', 'emailxfer.com', 'emz.net',
  'enterto.com', 'ephemail.net', 'etranquil.com', 'etranquil.net',
  'etranquil.org', 'evopo.com', 'explodemail.com', 'express.net.ua',
  'eyepaste.com', 'fastacura.com', 'fasttrackerz.com', 'fettomeansen.com',
  'filzmail.com', 'fixmail.tk', 'fleckens.hu', 'flyspam.com',
  'footard.com', 'forgetmail.com', 'fr33mail.info', 'frapmail.com',
  'front14.org', 'fudgerub.com', 'fux0ringduh.com', 'garliclife.com',
  'get1mail.com', 'get2mail.fr', 'getairmail.com', 'getmails.eu',
  'getonemail.com', 'getonemail.net', 'girlsundertheinfluence.com',
  'gishpuppy.com', 'goemailgo.com', 'gorillaswithdirtyarmpits.com',
  'gotmail.com', 'gotmail.net', 'gotmail.org', 'gowikibooks.com',
  'gowikicampus.com', 'gowikicars.com', 'gowikifilms.com',
  'grandmamail.com', 'grandmasmail.com', 'great-host.in',
  'greensloth.com', 'haltospam.com', 'hatespam.org',
  'hidemail.de', 'hidzz.com', 'hotpop.com', 'hulapla.de',
  'ieatspam.eu', 'ieatspam.info', 'imails.info', 'inbax.tk',
  'inbox.si', 'inboxalias.com', 'inboxclean.com', 'inboxclean.org',
  'incognitomail.com', 'incognitomail.net', 'incognitomail.org',
  'insorg-mail.info', 'ipoo.org', 'irish2me.com', 'iwi.net',
  'jetable.com', 'jetable.fr.nf', 'jetable.net', 'jetable.org',
  'jnxjn.com', 'jourrapide.com', 'junk1e.com', 'kasmail.com',
  'kaspop.com', 'keepmymail.com', 'killmail.com', 'killmail.net',
  'kir.ch.tc', 'klassmaster.com', 'klassmaster.net', 'klzlk.com',
  'koszmail.pl', 'kurzepost.de', 'lawlita.com', 'letthemeatspam.com',
  'lhsdv.com', 'lifebyfood.com', 'link2mail.net', 'litedrop.com',
  'lol.ovpn.to', 'lookugly.com', 'lopl.co.cc', 'lortemail.dk',
  'lr78.com', 'lroid.com', 'lukop.dk', 'luv2.us',
  'm21.cc', 'mail-hierarchie.de', 'mail-temporaire.fr', 'mail.by',
  'mail.mezimages.net', 'mail.zp.ua', 'mail1a.de', 'mail21.cc',
  'mail2rss.org', 'mail333.com', 'mailbidon.com', 'mailblocks.com',
  'mailbucket.org', 'mailcat.biz', 'mailexpire.com', 'mailfa.tk',
  'mailforspam.com', 'mailfreeonline.com', 'mailguard.me',
  'mailhazard.com', 'mailhazard.us', 'mailhz.me', 'mailimate.com',
  'mailin8r.com', 'mailinater.com', 'mailinator.net', 'mailinator.org',
  'mailinator.us', 'mailinator2.com', 'mailincubator.com',
  'mailismagic.com', 'mailmate.com', 'mailme.ir', 'mailme.lv',
  'mailmetrash.com', 'mailmoat.com', 'mailms.com', 'mailnator.com',
  'mailnull.com', 'mailorg.org', 'mailpick.biz', 'mailrock.biz',
  'mailscrap.com', 'mailshell.com', 'mailsiphon.com', 'mailtemp.info',
  'mailtothis.com', 'mailtrash.net', 'mailtv.net', 'mailtv.tv',
  'mailzilla.com', 'mailzilla.org', 'makemetheking.com',
  'manifestgenerator.com', 'meltmail.com', 'messagebeamer.de',
  'mezimages.net', 'mfsa.ru', 'mierdamail.com', 'migmail.pl',
  'migumail.com', 'ministryofeducation.stream',
  'mintemail.com', 'misterpinball.de', 'mjukgansen.com',
  'mobi.web.id', 'mobileninja.co.uk', 'moncourrier.fr.nf',
  'monemail.fr.nf', 'monmail.fr.nf', 'monumentmail.com',
  'msa.minsmail.com', 'mt2015.com', 'mx0.wwwnew.eu',
  'my10minutemail.com', 'myalias.pw', 'mycard.net.ua',
  'mycleaninbox.net', 'myemailboxy.com', 'mymail-in.net',
  'mymailoasis.com', 'mynetstore.de', 'mypacks.net',
  'mypartyclip.de', 'myphantom.com', 'mysamp.de',
  'myspaceinc.com', 'myspaceinc.net', 'myspaceinc.org',
  'myspacepimpedup.com', 'mytemp.email', 'mytempmail.com',
  'mytrashmail.com', 'nabala.com', 'neomailbox.com',
  'nervmich.net', 'nervtansen.de', 'netmails.com',
  'netmails.net', 'neverbox.com', 'no-spam.ws',
  'nobulk.com', 'noclickemail.com', 'nogmailspam.info',
  'nomail.xl.cx', 'nomail2me.com', 'nomorespamemails.com',
  'noreply.org', 'nothingtoseehere.ca', 'nospam.ze.tc',
  'nospam4.us', 'nospamfor.us', 'nospammail.net',
  'notmailinator.com', 'nowhere.org', 'nowmymail.com',
  'nurfuerspam.de', 'nus.edu.sg', 'nwldx.com',
  'objectmail.com', 'obobbo.com', 'odnorazovoe.ru',
  'oneoffemail.com', 'onewaymail.com', 'oopi.org',
  'ordinaryamerican.net', 'otherinbox.com', 'ourklips.com',
  'outlawspam.com', 'ovpn.to', 'owlpic.com',
  'pancakemail.com', 'pimpedupmyspace.com', 'pjjkp.com',
  'plexolan.de', 'pookmail.com', 'privacy.net',
  'proxymail.eu', 'prtnx.com', 'putthisinyouremail.com',
  'qq.com', 'quickinbox.com',
  'rcpt.at', 'reallymymail.com', 'recode.me',
  'recursor.net', 'regbypass.com', 'rejectmail.com',
  'rhyta.com', 'rklips.com', 'rmqkr.net',
  'royal.net', 'rppkn.com', 'rtrtr.com',
  'safersignup.de', 'safetymail.info', 'safetypost.de',
  'sandelf.de', 'saynotospams.com', 'scatmail.com',
  'schafmail.de', 'selfdestructingmail.com', 'sendspamhere.com',
  'shieldedmail.com', 'shiftmail.com', 'shitmail.me',
  'shortmail.net', 'sibmail.com', 'skeefmail.com',
  'slaskpost.se', 'slipry.net', 'slopsbox.com',
  'smashmail.de', 'smellfear.com', 'snakemail.com',
  'sneakemail.com', 'sneakymail.de', 'snkmail.com',
  'sofimail.com', 'sofort-mail.de', 'softpls.asia',
  'sogetthis.com', 'soodonims.com', 'spam.la',
  'spam.su', 'spamavert.com', 'spambob.com', 'spambob.net',
  'spambob.org', 'spambog.com', 'spambog.de', 'spambog.ru',
  'spambox.us', 'spamcannon.com', 'spamcannon.net',
  'spamcero.com', 'spamcorptastic.com', 'spamcowboy.com',
  'spamcowboy.net', 'spamcowboy.org', 'spamday.com',
  'spamex.com', 'spamfighter.cf', 'spamfighter.ga',
  'spamfighter.gq', 'spamfighter.ml', 'spamfighter.tk',
  'spamfree24.com', 'spamfree24.de', 'spamfree24.eu',
  'spamfree24.info', 'spamfree24.net', 'spamfree24.org',
  'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
  'spamherelots.com', 'spamhereplease.com', 'spamhole.com',
  'spamify.com', 'spaminator.de', 'spamkill.info',
  'spaml.com', 'spaml.de', 'spammotel.com',
  'spamobox.com', 'spamoff.de', 'spamslicer.com',
  'spamspot.com', 'spamstack.net', 'spamthis.co.uk',
  'spamtrap.ro', 'spamtrail.com', 'spamwc.de',
  'speed.1s.fr', 'superrito.com', 'superstachel.de',
  'suremail.info', 'svk.jp', 'sweetxxx.de',
  'tafmail.com', 'tagyoureit.com', 'talkinator.com',
  'tapchicuoihoi.com', 'teewars.org', 'teleworm.com',
  'teleworm.us', 'temp.emeraldcraft.com', 'temp.headstrong.de',
  'tempalias.com', 'tempe4mail.com', 'tempemail.co.za',
  'tempemail.com', 'tempemail.net', 'tempinbox.com',
  'tempinbox.co.uk', 'tempmail.eu', 'tempmail.it',
  'tempmail2.com', 'tempmailer.com', 'tempmailer.de',
  'tempomail.fr', 'temporarily.de', 'temporarioemail.com.br',
  'temporaryemail.net', 'temporaryemail.us', 'temporaryforwarding.com',
  'temporaryinbox.com', 'temporarymailaddress.com', 'tempthe.net',
  'thankdog.com', 'thankyou2010.com', 'thc.st',
  'thecriminals.com', 'thisisnotmyrealemail.com', 'thismail.net',
  'throwawayemailaddress.com', 'tittbit.in', 'tizi.com',
  'tmailinator.com', 'toiea.com', 'toomail.biz',
  'topranklist.de', 'tradermail.info', 'trash-amil.com',
  'trash-mail.at', 'trash-mail.com', 'trash-mail.de',
  'trash2009.com', 'trashdevil.com', 'trashdevil.de',
  'trashemail.de', 'trashymail.com', 'trashymail.net',
  'trbvm.com', 'trbvn.com', 'trialmail.de',
  'trickmail.net', 'trillianpro.com', 'turual.com',
  'twinmail.de', 'tyldd.com', 'uggsrock.com',
  'umail.net', 'upliftnow.com', 'uplipht.com',
  'venompen.com', 'veryreallyelite.club', 'viditag.com',
  'viewcastmedia.com', 'viewcastmedia.net', 'viewcastmedia.org',
  'vomoto.com', 'vpn.st', 'vsimcard.com',
  'vubby.com', 'wasteland.rfc822.org', 'webemail.me',
  'webm4il.info', 'wegwerfadresse.de', 'wegwerfemail.com',
  'wegwerfemail.de', 'wegwerfmail.de', 'wegwerfmail.net',
  'wegwerfmail.org', 'wh4f.org', 'whatiaas.com',
  'whatpaas.com', 'whyspam.me', 'wickmail.net',
  'wilemail.com', 'willhackforfood.biz', 'willselfdestruct.com',
  'winemaven.info', 'wronghead.com', 'wuzup.net',
  'wuzupmail.net', 'wwwnew.eu', 'xagloo.com',
  'xemaps.com', 'xents.com', 'xjoi.com',
  'xmaily.com', 'xoxy.net', 'yapped.net',
  'yep.it', 'yogamaven.com', 'yomail.info',
  'yuurok.com', 'zehnminutenmail.de', 'zippymail.info',
  'zoaxe.com', 'zoemail.org',
]);

/**
 * Check if an email address belongs to a known disposable/temporary email provider.
 * 
 * @param email - The email address to check
 * @returns true if the email domain is on the disposable blocklist
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}
