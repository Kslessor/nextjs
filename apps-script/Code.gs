/**
 * Ajai · Rotimi family tree — Google Apps Script backend.
 *
 * Canonical data lives as a JSON file in Drive; the bound Google Sheet holds
 * the suggestion queue and the audit log. Kelly's approval is the only path
 * to publish: the public endpoints can read data and append pending
 * suggestions, nothing else.
 *
 * SETUP (one time)
 * 1. Create a Google Sheet with two tabs named exactly:  suggestions, audit
 *    suggestions header row:
 *      suggestionId | type | targetId | submitterName | submitterEmail |
 *      relationship | payloadJSON | message | createdAt | status | decidedAt | reason
 *    audit header row:
 *      at | action | suggestionId | summary | by | snapshotJSON
 * 2. Upload family-data.json to Drive.
 * 3. Extensions → Apps Script (from the Sheet), paste this file.
 * 4. Project Settings → Script Properties, add:
 *      SECRET        = a long random string (this gates the console)
 *      DATA_FILE_ID  = the Drive file id of family-data.json
 *      NOTIFY_EMAIL  = kelly@kellyslessor.com   (summary email on new suggestions)
 * 5. Deploy → New deployment → Web app:
 *      Execute as: Me    ·    Who has access: Anyone
 *    Copy the /exec URL into lib/config.ts (APPS_SCRIPT_URL) and redeploy the site.
 *
 * Endpoints
 *   GET  ?action=data                     → canonical JSON (public)
 *   GET  ?action=pending&key=SECRET       → pending suggestions (console)
 *   POST {action:'suggest', suggestion}   → append pending row + email Kelly
 *   POST {action:'decide', key, suggestionId, decision, editedPayload?, reason?}
 *   POST {action:'undo',   key, suggestionId}  → restore pre-decision snapshot
 */

var PROPS = PropertiesService.getScriptProperties();

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function loadData_() {
  var file = DriveApp.getFileById(PROPS.getProperty('DATA_FILE_ID'));
  var raw = JSON.parse(file.getBlob().getDataAsString());
  // accept people/families as arrays or as id-keyed objects
  if (!Array.isArray(raw.people)) {
    raw.people = Object.keys(raw.people).map(function (k) { return raw.people[k]; });
  }
  if (!Array.isArray(raw.families)) {
    raw.families = Object.keys(raw.families).map(function (k) { return raw.families[k]; });
  }
  return raw;
}

function saveData_(data) {
  var file = DriveApp.getFileById(PROPS.getProperty('DATA_FILE_ID'));
  file.setContent(JSON.stringify(data, null, 2));
}

function sheet_(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet tab: ' + name);
  return sheet;
}

function checkSecret_(key) {
  var secret = PROPS.getProperty('SECRET');
  if (!secret || key !== secret) throw new Error('Not authorised');
}

function sanitize_(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, 20000);
}

// ---------- HTTP entry points ----------

function doGet(e) {
  try {
    var action = (e.parameter.action || '').toLowerCase();
    if (action === 'data') return json_(loadData_());
    if (action === 'pending') {
      checkSecret_(e.parameter.key);
      return json_({ ok: true, suggestions: listPending_() });
    }
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = (body.action || '').toLowerCase();
    if (action === 'suggest') return json_(handleSuggest_(body.suggestion));
    if (action === 'decide') {
      checkSecret_(body.key);
      return json_(handleDecide_(body));
    }
    if (action === 'undo') {
      checkSecret_(body.key);
      return json_(handleUndo_(body.suggestionId));
    }
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

// ---------- suggest ----------

function rateLimit_() {
  var cache = CacheService.getScriptCache();
  var count = Number(cache.get('suggest-count') || 0);
  if (count >= 30) throw new Error('Too many suggestions right now — please try later.');
  cache.put('suggest-count', String(count + 1), 3600); // 30/hour overall
}

// Photos arrive as data URIs from the suggest form. A Sheets cell can't hold
// one, so store the image as a Drive file (shared read-only) and replace the
// payload value with its URL. Optional Script Property PHOTOS_FOLDER_ID picks
// the folder; otherwise Drive root.
function storePhoto_(container, sug) {
  if (!container || typeof container.photo !== 'string') return;
  var m = container.photo.match(/^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+\/=]+)$/);
  if (!m) return;
  var ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), 'image/' + m[1],
    'family-photo-' + sug.suggestionId + '.' + ext);
  var folderId = PROPS.getProperty('PHOTOS_FOLDER_ID');
  var file = folderId ? DriveApp.getFolderById(folderId).createFile(blob) : DriveApp.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  container.photo = 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

function handleSuggest_(sug) {
  if (!sug || !sug.suggestionId || !sug.type || !sug.targetId) {
    throw new Error('Malformed suggestion');
  }
  rateLimit_();

  var data = loadData_();
  var problem = validateSuggestion_(data, sug);
  if (problem) throw new Error(problem);

  if (sug.payload) {
    storePhoto_(sug.payload.fields, sug);
    storePhoto_(sug.payload.person, sug);
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet_('suggestions').appendRow([
      sanitize_(sug.suggestionId),
      sanitize_(sug.type),
      sanitize_(sug.targetId),
      sanitize_(sug.submitter && sug.submitter.name),
      sanitize_(sug.submitter && sug.submitter.email),
      sanitize_(sug.submitter && sug.submitter.relationship),
      JSON.stringify(sug.payload || {}),
      sanitize_(sug.message),
      sug.createdAt || new Date().toISOString(),
      'pending',
      '',
      '',
    ]);
  } finally {
    lock.releaseLock();
  }

  var notify = PROPS.getProperty('NOTIFY_EMAIL');
  if (notify) {
    MailApp.sendEmail(
      notify,
      'Family tree: new suggestion (' + sug.type + ' on ' + sug.targetId + ')',
      'From: ' + sanitize_(sug.submitter && sug.submitter.name) +
        ' (' + sanitize_(sug.submitter && sug.submitter.relationship) + ')\n' +
        'Message: ' + sanitize_(sug.message) + '\n\n' +
        JSON.stringify(sug.payload, null, 2) +
        '\n\nOpen the console to review.'
    );
  }
  return { ok: true };
}

function listPending_() {
  var rows = sheet_('suggestions').getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (r[9] !== 'pending') continue;
    out.push({
      suggestionId: r[0],
      type: r[1],
      targetId: r[2],
      submitter: { name: r[3], email: r[4], relationship: r[5] },
      payload: JSON.parse(r[6] || '{}'),
      message: r[7],
      createdAt: r[8],
      status: r[9],
    });
  }
  return out;
}

// ---------- decide ----------

function handleDecide_(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = sheet_('suggestions');
    var rows = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === body.suggestionId) { rowIndex = i; break; }
    }
    if (rowIndex < 0) throw new Error('Unknown suggestionId');
    if (rows[rowIndex][9] !== 'pending') throw new Error('Already decided');

    var sug = {
      suggestionId: rows[rowIndex][0],
      type: rows[rowIndex][1],
      targetId: rows[rowIndex][2],
      payload: body.editedPayload || JSON.parse(rows[rowIndex][6] || '{}'),
    };

    var data = loadData_();
    var summary;
    if (body.decision === 'approve') {
      var snapshot = JSON.stringify(data);
      var result = applySuggestion_(data, sug);
      saveData_(result.data);
      summary = result.summary;
      appendAudit_('approve', sug.suggestionId, summary, snapshot);
    } else if (body.decision === 'reject') {
      summary = 'rejected — ' + sug.type + ' on ' + sug.targetId;
      appendAudit_('reject', sug.suggestionId, summary, '');
      var email = rows[rowIndex][4];
      if (email && body.reason) {
        MailApp.sendEmail(
          email,
          'Family tree: about your suggestion',
          'Thank you for your suggestion to the family tree. Kelly reviewed it and ' +
            'decided not to apply it this time.\n\nHer note: ' + sanitize_(body.reason)
        );
      }
    } else {
      throw new Error('Unknown decision');
    }

    sheet.getRange(rowIndex + 1, 10, 1, 3).setValues([[
      body.decision === 'approve' ? 'approved' : 'rejected',
      new Date().toISOString(),
      sanitize_(body.reason),
    ]]);
    return { ok: true, data: loadData_(), summary: summary };
  } finally {
    lock.releaseLock();
  }
}

function handleUndo_(suggestionId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var audit = sheet_('audit').getDataRange().getValues();
    for (var i = audit.length - 1; i >= 1; i--) {
      if (audit[i][2] === suggestionId && audit[i][1] === 'approve' && audit[i][5]) {
        saveData_(JSON.parse(audit[i][5]));
        appendAudit_('undo', suggestionId, 'restored snapshot', '');
        // reopen the suggestion
        var sheet = sheet_('suggestions');
        var rows = sheet.getDataRange().getValues();
        for (var j = 1; j < rows.length; j++) {
          if (rows[j][0] === suggestionId) {
            sheet.getRange(j + 1, 10).setValue('pending');
            break;
          }
        }
        return { ok: true, data: loadData_() };
      }
    }
    throw new Error('No approval snapshot found for ' + suggestionId);
  } finally {
    lock.releaseLock();
  }
}

function appendAudit_(action, suggestionId, summary, snapshotJSON) {
  sheet_('audit').appendRow([
    new Date().toISOString(),
    action,
    suggestionId,
    summary,
    Session.getEffectiveUser().getEmail(),
    snapshotJSON,
  ]);
}

// ---------- apply logic (mirror of lib/apply.ts) ----------

function personById_(data, id) {
  for (var i = 0; i < data.people.length; i++) {
    if (data.people[i].id === id) return data.people[i];
  }
  return null;
}

function familyById_(data, id) {
  for (var i = 0; i < data.families.length; i++) {
    if (data.families[i].id === id) return data.families[i];
  }
  return null;
}

function nextId_(prefix, data) {
  var max = 0;
  var list = prefix === 'I' ? data.people : data.families;
  for (var i = 0; i < list.length; i++) {
    var m = String(list[i].id).match(/^([A-Z]+)(\d+)$/);
    if (m && m[1] === prefix) max = Math.max(max, parseInt(m[2], 10));
  }
  return prefix + (max + 1);
}

var EDITABLE_FIELDS_ = [
  'given', 'surname', 'sex', 'title', 'suffix', 'nickname', 'epithet',
  'birth', 'christening', 'death', 'burial', 'causeOfDeath', 'ageAtDeath',
  'story', 'photo',
];

function blankPerson_(id) {
  var p = { id: id, parents: null, spouseFamilies: [] };
  EDITABLE_FIELDS_.forEach(function (k) { p[k] = null; });
  p.spouseFamilies = [];
  return p;
}

function newFamily_(data) {
  var fam = { id: nextId_('F', data), husband: null, wife: null, marriage: null, children: [] };
  data.families.push(fam);
  return fam;
}

function attachChild_(fam, child) {
  if (child.parents && child.parents !== fam.id) {
    throw new Error(child.id + ' already has parents (' + child.parents + ')');
  }
  if (fam.children.indexOf(child.id) < 0) fam.children.push(child.id);
  child.parents = fam.id;
}

function attachSpouse_(fam, spouse) {
  var slot = spouse.sex === 'F' ? 'wife' : 'husband';
  var other = slot === 'wife' ? 'husband' : 'wife';
  if (fam[slot] && fam[slot] !== spouse.id) {
    if (!fam[other]) fam[other] = spouse.id;
    else throw new Error('Family ' + fam.id + ' already has both spouses');
  } else {
    fam[slot] = spouse.id;
  }
  if (spouse.spouseFamilies.indexOf(fam.id) < 0) spouse.spouseFamilies.push(fam.id);
}

function linkRelative_(data, target, other, relation, familyId) {
  var fam;
  if (relation === 'child') {
    if (familyId) {
      fam = familyById_(data, familyId);
      if (!fam) throw new Error('Unknown family id: ' + familyId);
      if (fam.husband !== target.id && fam.wife !== target.id) {
        throw new Error(target.id + ' is not a spouse in ' + familyId);
      }
    } else {
      fam = familyById_(data, target.spouseFamilies[0]);
    }
    if (!fam) { fam = newFamily_(data); attachSpouse_(fam, target); }
    attachChild_(fam, other);
  } else if (relation === 'parent') {
    fam = familyById_(data, target.parents);
    if (!fam) { fam = newFamily_(data); attachChild_(fam, target); }
    attachSpouse_(fam, other);
  } else if (relation === 'spouse') {
    if (familyId) fam = familyById_(data, familyId);
    if (!fam) {
      for (var i = 0; i < target.spouseFamilies.length; i++) {
        var f = familyById_(data, target.spouseFamilies[i]);
        if (f && (!f.husband || !f.wife)) { fam = f; break; }
      }
    }
    if (!fam) fam = newFamily_(data);
    attachSpouse_(fam, target);
    attachSpouse_(fam, other);
  } else if (relation === 'sibling') {
    fam = familyById_(data, target.parents);
    if (!fam) { fam = newFamily_(data); attachChild_(fam, target); }
    attachChild_(fam, other);
  } else {
    throw new Error('Unknown relation: ' + relation);
  }
}

function applySuggestion_(data, sug) {
  data.meta.revision = (typeof data.meta.revision === 'number' ? data.meta.revision : 0) + 1;
  var target = personById_(data, sug.targetId);
  if (!target) throw new Error('Unknown person id: ' + sug.targetId);

  if (sug.type === 'edit') {
    var changed = [];
    EDITABLE_FIELDS_.forEach(function (key) {
      if (sug.payload.fields && key in sug.payload.fields) {
        target[key] = sug.payload.fields[key] === undefined ? null : sug.payload.fields[key];
        changed.push(key);
      }
    });
    if (!changed.length) throw new Error('Edit changes nothing');
    return { data: data, summary: 'Edited ' + target.id + ': ' + changed.join(', ') };
  }

  if (sug.type === 'addPerson') {
    var person = blankPerson_(nextId_('I', data));
    EDITABLE_FIELDS_.forEach(function (key) {
      if (sug.payload.person && key in sug.payload.person) {
        person[key] = sug.payload.person[key] === undefined ? null : sug.payload.person[key];
      }
    });
    data.people.push(person);
    linkRelative_(data, target, person, sug.payload.relation, sug.payload.familyId);
    return {
      data: data,
      summary: 'Added ' + person.id + ' as ' + sug.payload.relation + ' of ' + target.id,
    };
  }

  if (sug.type === 'addRelationship') {
    var otherPerson = personById_(data, sug.payload.otherId);
    if (!otherPerson) throw new Error('Unknown person id: ' + sug.payload.otherId);
    linkRelative_(data, target, otherPerson, sug.payload.relation, sug.payload.familyId);
    return {
      data: data,
      summary: 'Linked ' + otherPerson.id + ' as ' + sug.payload.relation + ' of ' + target.id,
    };
  }

  if (sug.type === 'reportError') {
    return { data: data, summary: 'Acknowledged report on ' + sug.targetId };
  }

  throw new Error('Unknown suggestion type: ' + sug.type);
}

function validateSuggestion_(data, sug) {
  if (!personById_(data, sug.targetId)) return 'Unknown target id: ' + sug.targetId;
  var p = sug.payload || {};
  if (sug.type === 'addRelationship') {
    if (!personById_(data, p.otherId)) return 'Unknown person id: ' + p.otherId;
    if (p.familyId && !familyById_(data, p.familyId)) return 'Unknown family id: ' + p.familyId;
  }
  if (sug.type === 'addPerson') {
    if (p.familyId && !familyById_(data, p.familyId)) return 'Unknown family id: ' + p.familyId;
  }
  return null;
}
