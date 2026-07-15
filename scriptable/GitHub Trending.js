// GitHub Trending Widget for Scriptable (iOS)
// Large widget · 5 repos per page · hourly rotation
// White bg, blue accent, yellow stars, Chinese summaries

const ENDPOINT = 'https://YOUR-WORKER.workers.dev';
const REPOS_PER_PAGE = 6;

const hour = new Date().getHours();
const pageIndex = hour % 2; // 2 pages, rotate hourly

const widget = new ListWidget();
widget.backgroundColor = Color.white();
widget.setPadding(14, 16, 10, 16);
widget.url = 'https://github.com/trending';

try {
  const req = new Request(ENDPOINT);
  const data = await req.loadJSON();
  const allRepos = data.repos;
  const start = pageIndex * REPOS_PER_PAGE;
  const repos = allRepos.slice(start, start + REPOS_PER_PAGE);

  // Header
  const header = widget.addStack();
  header.centerAlignContent();
  const bar = header.addText('|');
  bar.font = Font.boldSystemFont(18);
  bar.textColor = new Color('#007aff');
  header.addSpacer(8);
  const title = header.addText('GitHub Trending');
  title.font = Font.boldSystemFont(15);
  title.textColor = new Color('#1d1d1f');
  header.addSpacer();
  const dateText = header.addText(fmtDate(data.timestamp));
  dateText.font = Font.systemFont(10);
  dateText.textColor = new Color('#aeaeb2');

  widget.addSpacer(6);

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const globalRank = start + i + 1;

    if (i > 0) widget.addSpacer(4);

    // Line 1: medal/rank + name + stars
    const topLine = widget.addStack();
    topLine.centerAlignContent();

    if (globalRank <= 3) {
      const medals = ['🥇', '🥈', '🥉'];
      const medal = topLine.addText(medals[globalRank - 1]);
      medal.font = Font.systemFont(13);
    } else {
      const rank = topLine.addText(`${globalRank}`);
      rank.font = Font.boldSystemFont(12);
      rank.textColor = new Color('#c7c7cc');
      rank.size = new Size(20, 0);
    }
    topLine.addSpacer(2);

    const name = topLine.addText(repo.fullName);
    name.font = Font.semiboldSystemFont(13);
    name.textColor = new Color('#1d1d1f');
    name.lineLimit = 1;
    topLine.addSpacer();
    const starIcon = topLine.addText('★');
    starIcon.font = Font.systemFont(10);
    starIcon.textColor = new Color('#f5c518');
    const ct = repo.starsToday;
    const starColor = ct >= 1500 ? '#e8651a' : ct >= 500 ? '#d4880f' : '#6b7280';
    const starNum = topLine.addText(`+${fmtNum(ct)}`);
    starNum.font = Font.boldSystemFont(12);
    starNum.textColor = new Color(starColor);

    // Line 2: Chinese summary
    const summaryRow = widget.addStack();
    summaryRow.setPadding(1, 22, 0, 0);
    const summary = summaryRow.addText(repo.summary || repo.description.slice(0, 40));
    summary.font = Font.mediumSystemFont(11);
    summary.textColor = new Color('#3a3a3c');
    summary.lineLimit = 1;

    // Line 3: total stars + English desc
    const descRow = widget.addStack();
    descRow.setPadding(1, 22, 0, 0);
    const totalStr = repo.totalStars > 0 ? '☆ ' + fmtNum(repo.totalStars) + ' · ' : '';
    const descText = descRow.addText(totalStr + (repo.description || '').slice(0, 60));
    descText.font = Font.systemFont(9);
    descText.textColor = new Color('#aeaeb2');
    descText.lineLimit = 1;

    // Divider (except last)
    if (i < repos.length - 1) {
      widget.addSpacer(4);
      const divStack = widget.addStack();
      divStack.size = new Size(295, 0.5);
      divStack.backgroundColor = new Color('#f0f0f0');
    }
  }

  widget.addSpacer();

  // Footer
  const footer = widget.addStack();
  const updated = footer.addText(`Updated ${new Date(data.timestamp * 1000).getHours()}:${String(new Date(data.timestamp * 1000).getMinutes()).padStart(2, '0')}`);
  updated.font = Font.systemFont(9);
  updated.textColor = new Color('#c4c4c8');
  footer.addSpacer();
  const page = footer.addText(`Page ${pageIndex + 1}/2 →`);
  page.font = Font.mediumSystemFont(9);
  page.textColor = new Color('#007aff');

} catch (e) {
  const err = widget.addText('⚠️ Load failed');
  err.font = Font.systemFont(13);
  err.textColor = Color.red();
}

Script.setWidget(widget);
widget.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000);
Script.complete();

function fmtDate(ts) {
  const d = new Date(ts * 1000);
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${m[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function fmtNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}
