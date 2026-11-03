// Careers: the roles we're hiring for (written in the back office, shown at /careers once open)
// and the applications to them (name, contact, links, a note and a CV), reviewed in the back
// office. A role is a draft until it's opened; closing it takes it off the site but keeps its
// applications.
//
// Stored with server/storage.js as storage.open("careers", CAREER_PARTS); CVs (PDF or Word, up
// to 5 MB) in storage.open("careerfiles", CAREER_FILE_PARTS), apart, so the lists stay small.

import { randomBytes } from "node:crypto";
import { inflateRawSync } from "node:zlib";

export class CareerError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const CAREER_PARTS = { roles: (r) => r.id, applications: (a) => a.id, page: (p) => p.id };
export const CAREER_FILE_PARTS = { files: (f) => f.id };

export const ROLE_TYPES = ["Full-time", "Part-time", "Contract", "Seasonal"];
export const ROLE_STATUSES = ["draft", "open", "closed"];
export const APPLICATION_STATUSES = ["new", "reviewing", "interview", "offer", "hired", "declined"];
// How an applicant is graded, best first: A to F (none until graded).
export const APPLICATION_GRADES = ["A", "B", "C", "D", "F"];
// Grades from before A to F, read as their letter.
const OLD_GRADES = { "strong-yes": "A", yes: "B", maybe: "C", no: "F" };
// CVs: PDF or Word.
export const CV_TYPES = { "application/pdf": "pdf", "application/msword": "doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx" };
const CV_MAX = 5 * 1024 * 1024;

const text = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const longText = (v, n) => String(v ?? "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, n);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
// Only web addresses: a portfolio, LinkedIn, Instagram.
const cleanLink = (v) => {
  const s = text(v, 300);
  if (!s) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return /^https?:$/.test(u.protocol) && /\./.test(u.hostname) ? u.href : "";
  } catch {
    return "";
  }
};

/* A role's description is kept as a small, safe set of marks (the back office editor writes
   them; anything typed or pasted is escaped before it's shown):
     ## Heading            - item  (or * or •)      1. item
     **bold**   __underline__   [link text](https://… / mailto:… / /page)
   A blank line or a new line starts a new paragraph. Text pasted from elsewhere is read kindly: a
   short line ending in ":" ("Responsibilities:"), or one that's all bold, becomes a heading. */
const escHtml = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeHref = (u) => (/^(https?:\/\/|mailto:|\/(?!\/))/i.test(u) ? u : /^[\w-]+\.[a-z]{2,}(\/|$)/i.test(u) ? `https://${u}` : "");
function inline(text) {
  return escHtml(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
      const href = safeHref(url.replace(/&amp;/g, "&"));
      return href ? `<a href="${escHtml(href)}"${/^https?:/i.test(href) ? ' rel="noopener noreferrer" target="_blank"' : ""}>${label}</a>` : label;
    })
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>");
}
export function jobBodyHtml(body) {
  const out = [];
  let list = null; // { tag, items }
  const close = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.tag}>`);
    list = null;
  };
  for (const raw of String(body || "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      close();
      continue;
    }
    const bullet = /^[-*•●▪◦]\s+(.*)$/.exec(line);
    const numbered = /^\d{1,2}[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const tag = bullet ? "ul" : "ol";
      if (list?.tag !== tag) (close(), (list = { tag, items: [] }));
      list.items.push((bullet || numbered)[1]);
      continue;
    }
    close();
    const heading = /^#{1,3}\s+(.*)$/.exec(line)?.[1] ?? /^\*\*([^*]{1,80})\*\*:?$/.exec(line)?.[1] ?? (line.length <= 60 && /:$/.test(line) && !/https?:/.test(line) ? line.slice(0, -1) : null);
    out.push(heading != null ? `<h2>${inline(heading.replace(/:\s*$/, ""))}</h2>` : `<p>${inline(line)}</p>`);
  }
  close();
  return out.join("");
}

// The text of a Word (.docx) file: it's a zip, and the words are in word/document.xml. Read from
// the zip's own directory (no library); "" when it isn't one or can't be read. Old .doc files
// aren't read.
export function docxText(buf) {
  try {
    let end = buf.length - 22;
    while (end >= 0 && buf.readUInt32LE(end) !== 0x06054b50) end--;
    if (end < 0) return "";
    const count = buf.readUInt16LE(end + 10);
    let at = buf.readUInt32LE(end + 16);
    for (let i = 0; i < count && buf.readUInt32LE(at) === 0x02014b50; i++) {
      const method = buf.readUInt16LE(at + 10);
      const size = buf.readUInt32LE(at + 20);
      const nameLen = buf.readUInt16LE(at + 28);
      const extra = buf.readUInt16LE(at + 30);
      const comment = buf.readUInt16LE(at + 32);
      const local = buf.readUInt32LE(at + 42);
      const name = buf.toString("utf8", at + 46, at + 46 + nameLen);
      if (name === "word/document.xml") {
        const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
        const raw = buf.subarray(start, start + size);
        const xml = (method === 8 ? inflateRawSync(raw) : raw).toString("utf8");
        return xml
          .replace(/<w:tab\/>/g, "\t")
          .replace(/<\/w:p>|<w:br\/>/g, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }
      at += 46 + nameLen + extra + comment;
    }
  } catch {
    /* not a readable .docx */
  }
  return "";
}

export function createCareers({ store, files }) {
  const db = store.data;
  for (const a of db.applications || []) {
    if (OLD_GRADES[a.grade]) a.grade = OLD_GRADES[a.grade];
    if (OLD_GRADES[a.ai?.grade]) a.ai.grade = OLD_GRADES[a.ai.grade];
  }
  const save = () => store.save();
  const role = (id) => db.roles.find((r) => r.id === id) || null;

  function cleanRole(input, was: any = {}) {
    const r = {
      title: text(input.title ?? was.title, 100),
      team: text(input.team ?? was.team, 60),
      type: ROLE_TYPES.includes(input.type) ? input.type : was.type || "Full-time",
      location: text(input.location ?? was.location, 100),
      pay: text(input.pay ?? was.pay, 80),
      summary: text(input.summary ?? was.summary, 280),
      body: longText(input.body ?? was.body, 8000),
      status: ROLE_STATUSES.includes(input.status) ? input.status : was.status || "draft",
      // The people from the Careers page they'd work closest with (their ids), in order.
      workWith: (Array.isArray(input.workWith) ? input.workWith : was.workWith || []).filter((x) => /^tm-[a-f0-9]{6}$/.test(x)).slice(0, 8),
    };
    if (!r.title) throw new CareerError("Give the role a title.");
    // Opening a role puts it on the site and in Google's job search: it needs what a candidate
    // (and Google) needs to know.
    if (r.status === "open") {
      const missing = [!r.location && "where it's based", !r.summary && "a one-line summary", !r.body && "the description"].filter(Boolean);
      if (missing.length) throw new CareerError(`Add ${missing.length > 1 ? `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}` : missing[0]} before opening it.`);
    }
    return r;
  }

  async function saveRole(id, input) {
    const now = new Date().toISOString();
    const was = id ? role(id) : null;
    if (id && !was) throw new CareerError("That role is gone.", 404);
    const r = cleanRole(input, was || {});
    if (was) {
      if (r.status === "open" && was.status !== "open") was.openedAt = now;
      Object.assign(was, r, { updatedAt: now });
      await save();
      return was;
    }
    let rid = slug(r.title) || `role-${randomBytes(3).toString("hex")}`;
    for (let n = 2; role(rid); n++) rid = `${slug(r.title)}-${n}`;
    const made = { id: rid, ...r, createdAt: now, updatedAt: now, ...(r.status === "open" && { openedAt: now }) };
    db.roles.push(made);
    await save();
    return made;
  }

  async function deleteRole(id) {
    const r = role(id);
    if (!r) throw new CareerError("That role is gone.", 404);
    if (db.applications.some((a) => a.roleId === id)) throw new CareerError("It has applications, so it can only be closed (they stay on record).");
    db.roles = db.roles.filter((x) => x !== r);
    await save();
  }

  // An application: checked, its CV kept apart. Returns it.
  async function apply(roleId, input) {
    const r = role(roleId);
    if (!r || r.status !== "open") throw new CareerError("This role isn't open any more.", 404);
    const a = {
      id: `app-${randomBytes(6).toString("hex")}`,
      roleId,
      roleTitle: r.title,
      name: text(input.name, 80),
      email: text(input.email, 254).toLowerCase(),
      phone: text(input.phone, 40),
      links: [input.link1, input.link2].map(cleanLink).filter(Boolean),
      note: longText(input.note, 3000),
      cv: null,
      status: "new",
      at: new Date().toISOString(),
    };
    if (!a.name) throw new CareerError("Add your name.");
    if (!EMAIL_RE.test(a.email)) throw new CareerError("Add an email we can reply to.");
    if (db.applications.some((x) => x.roleId === roleId && x.email === a.email && Date.parse(x.at) > Date.now() - 864e5)) throw new CareerError("We already have your application for this role. Thank you!");
    const cv = input.cv;
    if (cv?.data) {
      const ext = CV_TYPES[cv.type];
      if (!ext) throw new CareerError("Send your CV as a PDF or Word file.");
      const data = Buffer.from(String(cv.data), "base64");
      if (!data.length) throw new CareerError("That CV file is empty.");
      if (data.length > CV_MAX) throw new CareerError("That CV is too big. Send one under 5 MB.");
      const id = `cv-${randomBytes(8).toString("hex")}`;
      const name = `${slug(a.name) || "cv"}.${ext}`;
      files.data.files.push({ id, type: cv.type, name, bytes: data.length, data: data.toString("base64"), at: a.at });
      await files.save();
      a.cv = { id, name, bytes: data.length };
    }
    if (!a.cv && !a.links.length) throw new CareerError("Add your CV or a link to your work.");
    db.applications.push(a);
    await save();
    return a;
  }

  async function updateApplication(id, input) {
    const a = db.applications.find((x) => x.id === id);
    if (!a) throw new CareerError("That application is gone.", 404);
    if (APPLICATION_STATUSES.includes(input.status)) a.status = input.status;
    if ("grade" in input) {
      if (APPLICATION_GRADES.includes(input.grade)) (a.grade = input.grade), (a.gradedAt = new Date().toISOString());
      else if (!input.grade) delete a.grade, delete a.gradedAt;
    }
    if (typeof input.notes === "string") a.notes = longText(input.notes, 2000);
    a.updatedAt = new Date().toISOString();
    await save();
    return a;
  }

  // Deleted with its CV (someone asks us to, or after hiring).
  async function deleteApplication(id) {
    const a = db.applications.find((x) => x.id === id);
    if (!a) throw new CareerError("That application is gone.", 404);
    db.applications = db.applications.filter((x) => x !== a);
    if (a.cv) {
      files.data.files = files.data.files.filter((f) => f.id !== a.cv.id);
      await files.save();
    }
    await save();
  }

  // The Careers page around the roles, as the team writes it (each part shows once it has
  // something in it): the opening (heading, a few lines, a photo), the team (people with a
  // photo, title, a quote and where they joined from), values, perks (each may have a logo),
  // and a closing line. Photos are uploaded first (saveImage) and named here by their id.
  const page = () => {
    const p = (db.page || []).find((x) => x.id === "page") || {};
    return {
      heading: p.heading || "",
      intro: p.intro || "",
      photo: p.photo || "",
      teamHeading: p.teamHeading || "",
      team: p.team || [],
      valuesHeading: p.valuesHeading || "",
      values: p.values || [],
      perksHeading: p.perksHeading || "",
      perks: p.perks || [],
      closingHeading: p.closingHeading || "",
      closing: p.closing || "",
    };
  };
  const imageId = (v) => (/^career-[a-f0-9]{12}\.(jpg|png|webp)$/.test(String(v || "")) && files.data.files.some((f) => f.id === v) ? v : "");
  const rows = (list, n, clean): any[] => (Array.isArray(list) ? list : []).map(clean).filter(Boolean).slice(0, n);
  async function savePage(input) {
    const next = {
      id: "page",
      heading: text(input.heading, 120),
      intro: longText(input.intro, 2000),
      photo: imageId(input.photo),
      teamHeading: text(input.teamHeading, 120),
      team: rows(input.team, 24, (x) => {
        const name = text(x?.name, 60);
        return name ? { id: /^tm-[a-f0-9]{6}$/.test(x.id) ? x.id : `tm-${randomBytes(3).toString("hex")}`, name, title: text(x.title, 80), photo: imageId(x.photo), quote: longText(x.quote, 400), from: text(x.from, 100) } : null;
      }),
      valuesHeading: text(input.valuesHeading, 120),
      values: rows(input.values, 12, (x) => (text(x?.title, 80) ? { title: text(x.title, 80), text: longText(x.text, 400) } : null)),
      perksHeading: text(input.perksHeading, 120),
      perks: rows(input.perks, 24, (x) => (text(x?.title, 60) ? { title: text(x.title, 60), detail: text(x.detail, 140), logo: imageId(x.logo) } : null)),
      closingHeading: text(input.closingHeading, 120),
      closing: longText(input.closing, 600),
      updatedAt: new Date().toISOString(),
    };
    db.page = [...(db.page || []).filter((x) => x.id !== "page"), next];
    // Photos no longer on the page go.
    const used = new Set([next.photo, ...next.team.map((t) => t.photo), ...next.perks.map((x) => x.logo)].filter(Boolean));
    const before = files.data.files.length;
    files.data.files = files.data.files.filter((f) => !f.id.startsWith("career-") || used.has(f.id) || Date.parse(f.at) > Date.now() - 864e5);
    if (files.data.files.length !== before) await files.save();
    await save();
    return page();
  }
  // A photo for the page (a data: URL, resized in the browser). Returns its id, served at /media/<id>.
  async function saveImage(dataUrl) {
    const m = /^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
    if (!m) throw new CareerError("Choose a JPEG, PNG or WebP photo.");
    const bytes = Buffer.byteLength(m[3], "base64");
    if (bytes > 3 * 1024 * 1024) throw new CareerError("That photo is too big. Use one under 3 MB.");
    const id = `career-${randomBytes(6).toString("hex")}.${m[2] === "jpeg" ? "jpg" : m[2]}`;
    files.data.files.push({ id, type: m[1], name: id, bytes, data: m[3], at: new Date().toISOString() });
    await files.save();
    return id;
  }
  const image = (id) => (String(id).startsWith("career-") ? files.data.files.find((f) => f.id === id) || null : null);

  /* Grading: the assistant reads each application against its role and suggests a grade with
     its reasons (ai); a grade the team picks (grade) wins over it. What it reads: the role, what
     they wrote, their links (as given, not opened) and their CV (a PDF as is, a .docx as text).
     Not their name, email or phone. */
  const gradeOf = (a) => a.grade || a.ai?.grade || "";
  function gradeMaterial(id) {
    const a = db.applications.find((x) => x.id === id);
    if (!a) return null;
    const r = role(a.roleId);
    const cvFile = a.cv && files.data.files.find((f) => f.id === a.cv.id);
    let cv = null;
    if (cvFile?.type === "application/pdf") cv = { pdf: cvFile.data };
    else if (cvFile && /wordprocessingml/.test(cvFile.type)) {
      const t = docxText(Buffer.from(cvFile.data, "base64"));
      cv = t ? { text: t.slice(0, 40_000) } : { unreadable: true };
    } else if (cvFile) cv = { unreadable: true };
    const roleText = [`Role: ${a.roleTitle}`, r?.team && `Team: ${r.team}`, r?.type && `Type: ${r.type}`, r?.location && `Where: ${r.location}`, r?.summary && `Summary: ${r.summary}`, r?.body && `Description:\n${r.body}`].filter(Boolean).join("\n");
    const appText = [`What they wrote: ${a.note || "(nothing)"}`, `Links they gave (not opened): ${a.links.join(", ") || "(none)"}`, cv?.text ? `Their CV:\n${cv.text}` : cv?.pdf ? "Their CV is the attached PDF." : cv?.unreadable ? "They sent a CV in a format that couldn't be read (judge on the rest, and say so)." : "No CV."].join("\n\n");
    return { roleText, appText, pdf: cv?.pdf || null };
  }
  async function setAiGrade(id, result) {
    const a = db.applications.find((x) => x.id === id);
    if (!a) return;
    if (result.error) {
      a.aiTries = (a.aiTries || 0) + 1;
      a.aiTriedAt = new Date().toISOString();
    } else {
      a.ai = { grade: result.grade, summary: text(result.summary, 300), strengths: (result.strengths || []).map((x) => text(x, 160)).filter(Boolean).slice(0, 3), concerns: (result.concerns || []).map((x) => text(x, 160)).filter(Boolean).slice(0, 3), at: new Date().toISOString() };
      delete a.aiTries, delete a.aiTriedAt;
    }
    await save();
  }
  // Waiting for the assistant: never graded, tried fewer than 3 times, the last over an hour ago.
  const toGrade = () => db.applications.filter((a) => !a.ai && (a.aiTries || 0) < 3 && (!a.aiTriedAt || Date.parse(a.aiTriedAt) < Date.now() - 36e5)).map((a) => a.id);

  // What the site shows: open roles, newest first, without anything internal.
  const publicPerson = (t) => ({ id: t.id, name: t.name, title: t.title, photo: t.photo ? `/media/${t.photo}` : "", quote: t.quote, from: t.from });
  const publicRole = (r) => ({ id: r.id, title: r.title, team: r.team, type: r.type, location: r.location, pay: r.pay, summary: r.summary, bodyHtml: jobBodyHtml(r.body), openedAt: r.openedAt || r.createdAt });
  // The people a role works closest with, as the site shows them.
  const workWith = (r) => (r.workWith || []).map((id) => page().team.find((t) => t.id === id)).filter(Boolean).map(publicPerson);
  const open = () => db.roles.filter((r) => r.status === "open").sort((a, b) => String(b.openedAt).localeCompare(String(a.openedAt)));

  return {
    role,
    open,
    publicRole,
    workWith,
    bodyHtml: jobBodyHtml,
    publicList: () => open().map(publicRole),
    page,
    publicPage: () => {
      const p = page();
      const img = (id) => (id ? `/media/${id}` : "");
      return {
        heading: p.heading,
        introHtml: jobBodyHtml(p.intro),
        photo: img(p.photo),
        teamHeading: p.teamHeading,
        team: p.team.map(publicPerson),
        valuesHeading: p.valuesHeading,
        values: p.values,
        perksHeading: p.perksHeading,
        perks: p.perks.map((x) => ({ title: x.title, detail: x.detail, logo: img(x.logo) })),
        closingHeading: p.closingHeading,
        closing: p.closing,
      };
    },
    savePage,
    // Perks added to the page's list, after what's there (any it already has, by title, are left).
    async addPerks(list) {
      const p = page();
      const have = new Set(p.perks.map((x) => x.title.toLowerCase()));
      return savePage({ ...p, perks: [...p.perks, ...list.filter((x) => !have.has(x.title.toLowerCase()))] });
    },
    saveImage,
    image,
    gradeOf,
    gradeMaterial,
    setAiGrade,
    toGrade,
    adminView: () => ({
      roles: [...db.roles].sort((a, b) => ROLE_STATUSES.indexOf(a.status) - ROLE_STATUSES.indexOf(b.status) || b.updatedAt.localeCompare(a.updatedAt)).map((r) => ({ ...r, bodyHtml: jobBodyHtml(r.body), applications: db.applications.filter((a) => a.roleId === r.id).length, waiting: db.applications.filter((a) => a.roleId === r.id && a.status === "new").length })),
      applications: [...db.applications].sort((a, b) => b.at.localeCompare(a.at)),
      types: ROLE_TYPES,
      statuses: APPLICATION_STATUSES,
      grades: APPLICATION_GRADES,
      page: page(),
    }),
    cvFile: (id) => files.data.files.find((f) => f.id === id) || null,
    saveRole,
    deleteRole,
    apply,
    updateApplication,
    deleteApplication,
    // Roles to start from, as drafts (not on the site) for the team to fill in (where, pay,
    // what the job is) and open. The caller makes sure this runs once.
    async seedDrafts(drafts) {
      if (db.roles.length) return;
      const now = new Date().toISOString();
      for (const d of drafts) db.roles.push({ id: slug(d.title), title: d.title, team: d.team, type: d.type || "Full-time", location: "", pay: "", summary: "", body: "", status: "draft", createdAt: now, updatedAt: now });
      await save();
    },
  };
}
