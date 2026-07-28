const els = {
  statusDot: document.getElementById('status-dot'),
  statusText: document.getElementById('status-text'),
  fetchedAt: document.getElementById('fetched-at'),
  primaryCard: document.getElementById('primary-card'),
  primaryLink: document.getElementById('primary-link'),
  primaryUrlText: document.getElementById('primary-url-text'),
  copyPrimary: document.getElementById('copy-primary'),
  linksCard: document.getElementById('links-card'),
  linkList: document.getElementById('link-list'),
  sourcesCard: document.getElementById('sources-card'),
  sourceList: document.getElementById('source-list'),
  refreshBtn: document.getElementById('refresh-btn'),
};

function setStatus(state, text) {
  els.statusDot.dataset.state = state;
  els.statusText.textContent = text;
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function sourceLabel(wiki) {
  if (wiki === 'zh') return '中文维基';
  if (wiki === 'en') return '英文维基';
  return wiki || 'unknown';
}

function render(data) {
  if (data.fetchedAt) {
    els.fetchedAt.hidden = false;
    els.fetchedAt.textContent = `更新时间：${formatTime(data.fetchedAt)}`;
  }

  if (!data.ok || !data.primaryUrl) {
    setStatus('error', data.error || '未能获取到可用链接');
    els.primaryCard.hidden = true;
    els.linksCard.hidden = true;
  } else {
    setStatus('ok', `已找到 ${data.links?.length || 1} 个候选链接`);
    els.primaryCard.hidden = false;
    els.primaryLink.href = data.primaryUrl;
    els.primaryUrlText.textContent = data.primaryUrl;
    els.copyPrimary.hidden = false;

    const links = data.links || [];
    if (links.length > 0) {
      els.linksCard.hidden = false;
      els.linkList.innerHTML = links
        .map((item) => {
          const label = item.label ? escapeHtml(item.label) : '链接';
          const url = escapeHtml(item.url);
          const wiki = escapeHtml(sourceLabel(item.wiki));
          const source = escapeHtml(item.source || '');
          return `
            <li class="link-item">
              <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
              <div class="link-meta">
                <span class="badge">${label}</span>
                <span class="badge">${wiki}</span>
                <span class="badge">${source}</span>
              </div>
            </li>
          `;
        })
        .join('');
    } else {
      els.linksCard.hidden = true;
    }
  }

  const sources = data.sources || [];
  if (sources.length > 0) {
    els.sourcesCard.hidden = false;
    els.sourceList.innerHTML = sources
      .map((s) => {
        const name = escapeHtml(s.label || s.id || 'source');
        const detail = s.ok
          ? `<span class="ok-text">成功 · ${s.count ?? 0} 条</span>`
          : `<span class="err-text">失败 · ${escapeHtml(s.error || 'error')}</span>`;
        const link = s.url
          ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${name}</a>`
          : name;
        return `<li class="source-item"><span>${link}</span>${detail}</li>`;
      })
      .join('');
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadLinks() {
  setStatus('loading', '正在从维基百科获取链接…');
  els.fetchedAt.hidden = true;
  els.primaryCard.hidden = true;
  els.linksCard.hidden = true;
  els.sourcesCard.hidden = true;
  els.copyPrimary.hidden = true;

  try {
    const res = await fetch('/api/link', { headers: { Accept: 'application/json' } });
    const data = await res.json();
    render(data);
  } catch (error) {
    setStatus('error', `请求失败：${error.message || error}`);
  }
}

els.copyPrimary?.addEventListener('click', async () => {
  const url = els.primaryLink.href;
  try {
    await navigator.clipboard.writeText(url);
    const original = els.copyPrimary.textContent;
    els.copyPrimary.textContent = '已复制';
    setTimeout(() => {
      els.copyPrimary.textContent = original;
    }, 1500);
  } catch {
    els.copyPrimary.textContent = '复制失败';
  }
});

els.refreshBtn?.addEventListener('click', () => {
  loadLinks();
});

loadLinks();
