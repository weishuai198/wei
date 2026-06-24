const fs = require('fs');
const path = require('path');
const { marked } = require('marked')
const OWNER = 'weishuai168';
const REPO = 'blog';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const POST_DIR = 'posts';
const PIN_LABEL = '置顶';
marked.setOptions({ gfm: true, breaks: true });
// 创建 posts 目录
if (!fs.existsSync(path.join(__dirname, POST_DIR))) {
    fs.mkdirSync(path.join(__dirname, POST_DIR));
}
async function fetchIssues() {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (GITHUB_TOKEN) headers['Authorization'] = 'token ' + GITHUB_TOKEN;
  let allIssues = [];
  let page = 1;
  while (true) {
    const url = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/issues?state=all&per_page=100&page=' + page + '&sort=created&direction=desc';
    const resp = await fetch(url, { headers });
    if (!resp.ok) throw new Error('API error: ' + resp.status + ' ' + resp.statusText);
    const data = await resp.json();
    if (data.length === 0) break;
    allIssues = allIssues.concat(data.filter(i => !i.pull_request));
    if (data.length < 100) break;
    page++;
  }
  return allIssues;
}
// ========== 修复后的摘要处理函数 ==========
function getExcerpt(body, maxLength) {
  if (!body) return '';
  maxLength = maxLength || 120;
  var text = body
    // 移除多行代码块
    .replace(/```[\s\S]*?```/g, '[code]')
    // 移除行内代码
    .replace(/`([^`]+)`/g, '$1')
    // 移除 Markdown 标题
    .replace(/#{1,6}\s*/g, '')
    // 移除加粗语法
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // 移除斜体语法
    .replace(/\*([^*]+)\*/g, '$1')
    // 移除 Markdown 图片语法 ![alt](url)
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // 【新增】全局过滤所有 HTML <img> 标签（兼容所有写法、大小写、属性）
    .replace(/<img\s*[^>]*?(\/>|>.*?<\/img>)/gi, '')
    // 移除 Markdown 链接 [text](url)
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // 移除列表标记
    .replace(/[-*]\s/g, '')
    // 换行转为单个空格
    .replace(/\n+/g, ' ')
    .trim();

  // 截取指定长度
  if (text.length <= maxLength) {
    // 【核心修复】最终输出前执行HTML转义，禁止标签解析
    return escapeHtml(text);
  }
  // 截取并转义
  return escapeHtml(text.slice(0, maxLength)) + '...';
}
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function getFirstImage(body) {
  if (!body) return '';
  var match = body.match(/!\[.*?\]\((.*?)\)/);
  if (match) return match[1];
  var htmlMatch = body.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlMatch) return htmlMatch[1];
  return '';
}
function buildArticleData(issue) {
  return {
    id: issue.number,
    title: issue.title,
    date: issue.created_at,
    dateFormatted: new Date(issue.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
    excerpt: getExcerpt(issue.body, 100),
    bodyHtml: marked.parse(issue.body || '暂无内容'),
    tags: (issue.labels || []).map(l => l.name),
    pinned: (issue.labels || []).some(l => l.name === PIN_LABEL),
    tagsHtml: (issue.labels || []).map(l => '<span class="post-tag">' + escapeHtml(l.name) + '</span>').join(''),
    thumb: getFirstImage(issue.body),
    htmlUrl: issue.html_url,
  };
}
function genSharedStyle() {
  return [
    ':root{--primary-color:#2563eb;--text-color:#1f2937;--bg-color:#f3f4f6;--card-bg:#ffffff;--border-color:#e5e7eb;--meta-color:#6b7280;--tag-bg:rgba(37,99,235,0.1);--tag-color:#2563eb;--hover-bg:rgba(37,99,235,0.05);--search-bg:#f9fafb;--shadow:0 4px 6px -1px rgba(0,0,0,0.1)}',
    '.dark{--primary-color:#60a5fa;--text-color:#e5e7eb;--bg-color:#111827;--card-bg:#1f2937;--border-color:#374151;--meta-color:#9ca3af;--tag-bg:rgba(96,165,250,0.15);--tag-color:#60a5fa;--hover-bg:rgba(96,165,250,0.08);--search-bg:#1a2332;--shadow:0 4px 6px -1px rgba(0,0,0,0.3)}',
    '*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}',
    'body{background-color:var(--bg-color);color:var(--text-color);line-height:1.6;transition:background-color 0.3s,color 0.3s}',
    '.container{max-width:1100px;margin:0 auto;padding:20px;display:grid;grid-template-columns:280px 1fr;gap:20px}',
    '.sidebar{background:var(--card-bg);padding:30px 24px;border-radius:12px;box-shadow:var(--shadow);height:fit-content;position:sticky;top:20px}',
    '.profile-img{width:100px;height:100px;border-radius:50%;margin:0 auto 16px;display:block;border:3px solid var(--primary-color);background:var(--border-color);object-fit:cover}',
    '.name{text-align:center;font-size:1.4rem;font-weight:700}',
    '.tag-wrapper{text-align:center;margin-bottom:20px}',
    '.tag{color:var(--tag-color);font-size:0.85rem;padding:4px 12px;background:var(--tag-bg);border-radius:20px;display:inline-block}',
    '.info-list{list-style:none;font-size:0.85rem;margin-bottom:20px;padding-top:16px;border-top:1px solid var(--border-color)}',
    '.info-list li{margin-bottom:8px;display:flex;justify-content:space-between;padding:2px 0}',
    '.info-list li span:first-child{color:var(--meta-color)}',
    '.info-list li a{color:var(--primary-color);text-decoration:none}',
    '.info-list li a:hover{text-decoration:underline}',
    '.sidebar-title{font-size:15px;font-weight:bold;margin:20px 0 10px 0;color:var(--primary-color)}',
    '.sidebar-desc{font-size:13px;line-height:1.7;color:var(--text-color)}',
    'main{display:flex;flex-direction:column;gap:16px}',
    '.card{background:var(--card-bg);padding:28px 30px;border-radius:12px;box-shadow:var(--shadow)}',
    'h2{border-left:4px solid var(--primary-color);padding-left:10px;margin-bottom:16px;font-size:1.25rem;font-weight:700}',
    '.search-bar{display:flex;gap:10px;margin-bottom:16px}',
    '.search-bar input{flex:1;padding:10px 14px;border:1px solid var(--border-color);border-radius:8px;background:var(--search-bg);color:var(--text-color);font-size:14px;outline:none;transition:border-color 0.2s}',
    '.search-bar input:focus{border-color:var(--primary-color)}',
    '.search-bar input::placeholder{color:var(--meta-color)}',
    '.tag-filter{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}',
    '.tag-filter-btn{padding:4px 12px;border:1px solid var(--border-color);border-radius:16px;background:transparent;color:var(--meta-color);font-size:12px;cursor:pointer;transition:all 0.2s}',
    '.tag-filter-btn:hover{border-color:var(--primary-color);color:var(--primary-color)}',
    '.tag-filter-btn.active{background:var(--primary-color);color:white;border-color:var(--primary-color)}',
    '.post-list{list-style:none}',
    '.post-item{padding:16px 0;border-bottom:1px solid var(--border-color);transition:background 0.2s;padding-left:12px;border-left:3px solid transparent;overflow:hidden}',
    '.post-item:hover{background:var(--hover-bg);border-left:3px solid var(--primary-color)}',
    '.post-item:last-child{border-bottom:none}',
    '.post-item-inner{display:flex;gap:14px;align-items:flex-start}',
    '.post-thumb-link{flex-shrink:0;width:80px;height:80px;overflow:hidden;border-radius:8px;display:block;margin-top:4px}',
    '.post-thumb{width:80px;height:80px;object-fit:cover;display:block}',
    '.post-body{flex:1;min-width:0}',
    '.post-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.post-date{color:var(--meta-color);font-size:0.82rem}',
    '.post-tags{display:flex;gap:6px;flex-wrap:wrap}',
    '.post-tag{font-size:0.75rem;padding:2px 8px;border-radius:10px;background:var(--tag-bg);color:var(--tag-color)}',
    '.pin-badge{font-size:0.75rem;padding:2px 8px;border-radius:10px;background:#fef3c7;color:#b45309;font-weight:600}',
    '.post-title-link{color:var(--text-color);text-decoration:none;font-size:1.05rem;font-weight:600;display:block;margin:4px 0;transition:color 0.2s}',
    '.post-title-link:hover{color:var(--primary-color)}',
    '.post-excerpt{color:var(--meta-color);font-size:0.88rem;line-height:1.6;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.no-results{text-align:center;padding:40px 20px;color:var(--meta-color)}',
    '.pagination{display:flex;justify-content:center;gap:6px;padding:10px 0;flex-wrap:wrap}',
    '.pagination-btn{padding:8px 14px;border:1px solid var(--border-color);border-radius:8px;background:var(--card-bg);color:var(--text-color);cursor:pointer;font-size:0.9rem;transition:all 0.2s;min-width:38px}',
    '.pagination-btn:hover:not(:disabled){border-color:var(--primary-color);color:var(--primary-color)}',
    '.pagination-btn.active{background:var(--primary-color);color:white;border-color:var(--primary-color)}',
    '.pagination-btn:disabled{opacity:0.4;cursor:not-allowed}',
    '.theme-toggle{position:fixed;bottom:24px;right:24px;width:44px;height:44px;border-radius:50%;border:1px solid var(--border-color);background:var(--card-bg);box-shadow:var(--shadow);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;z-index:100}',
    '.theme-toggle:hover{transform:scale(1.1)}',
    '.back-to-top{position:fixed;bottom:80px;right:24px;width:44px;height:44px;border-radius:50%;border:1px solid var(--border-color);background:var(--card-bg);box-shadow:var(--shadow);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;opacity:0;transition:all 0.3s;z-index:100;pointer-events:none}',
    '.back-to-top.visible{opacity:1;pointer-events:auto}',
    '.back-to-top:hover{transform:scale(1.1)}',
    '@media(max-width:768px){.container{grid-template-columns:1fr}.sidebar{position:static}.profile-img{width:80px;height:80px}.card{padding:20px}}'
  ].join('');
}
function genPostStyle() {
  return genSharedStyle() + [
    '.container{max-width:820px;display:block;padding:30px 20px}',
    '.content{font-size:16px;line-height:1.9}',
    '.content h1,.content h2{margin:28px 0 12px;font-size:1.5rem;font-weight:700;padding-bottom:8px;border-bottom:2px solid var(--border-color)}',
    '.content h3,.content h4{margin:24px 0 10px;font-size:1.2rem;font-weight:600}',
    '.content p{margin-bottom:16px}',
    '.content a{color:var(--primary-color);text-decoration:none}',
    '.content a:hover{text-decoration:underline}',
    '.content ul,.content ol{margin:12px 0;padding-left:24px}',
    '.content li{margin-bottom:6px}',
    '.content img{max-width:100%;border-radius:8px;margin:16px 0}',
    '.content blockquote{margin:16px 0;padding:12px 16px;border-left:4px solid var(--blockquote-border,#e5e7eb);background:var(--blockquote-bg,rgba(37,99,235,0.03));border-radius:0 8px 8px 0;color:var(--meta-color)}',
    '.content pre{background:var(--code-bg,#f6f8fa);padding:16px;border-radius:8px;overflow-x:auto;margin:16px 0}',
    '.content code{font-family:"SF Mono","Fira Code",Consolas,monospace;font-size:0.9em}',
    '.content :not(pre) > code{background:var(--code-bg,#f6f8fa);padding:2px 6px;border-radius:4px;color:var(--primary-color)}',
    '.content hr{border:none;border-top:2px solid var(--border-color);margin:24px 0}',
    '.article-nav{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:32px;padding-top:24px;border-top:1px solid var(--border-color)}',
    '.nav-item{padding:12px 16px;border-radius:8px;border:1px solid var(--border-color);text-decoration:none;color:var(--text-color);transition:all 0.2s;font-size:0.9rem}',
    '.nav-item:hover{border-color:var(--primary-color);background:var(--tag-bg)}',
    '.nav-item .nav-label{font-size:0.78rem;color:var(--meta-color);margin-bottom:4px}',
    '.nav-item .nav-title{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.nav-prev{text-align:left}',
    '.nav-next{text-align:right}'
  ].join('');
}
function genIndex(articles) {
  var articlesJson = JSON.stringify(articles.map(function(a) {
    return { id: a.id, title: a.title, date: a.dateFormatted, excerpt: a.excerpt, tags: a.tags, tagsHtml: a.tagsHtml, thumb: a.thumb, url: POST_DIR + '/post-' + a.id + '.html', pinned: a.pinned };
  })).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  var style = genSharedStyle();
  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '    <meta charset="UTF-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '    <meta name="description" content="laowei的个人博客">',
    '    <title>laowei</title>',
    '    <style>' + style + '</style>',
    '</head>',
    '<body>',
    '    <div class="container">',
    '        <aside class="sidebar">',
    '            <img class="profile-img" src="https://avatars.githubusercontent.com/weishuai168" alt="头像">',
    '            <div class="name">laowei</div>',
    '            <div class="tag-wrapper"><span class="tag">Full Stack Developer</span></div>',
    '            <ul class="info-list">',
    '                <li><span>位置</span><span>中国</span></li>',
    '                <li><span>GitHub</span><a href="https://github.com/weishuai168" target="_blank">GitHub</a></li>',
    '            </ul>',
    '            <div class="sidebar-title">关于我</div>',
    '            <p class="sidebar-desc">热爱前端开发、人工智能和开源技术。记录学习心得、技术分享和生活感悟。</p>',
    '            <div class="sidebar-title">其他</div>',
    '            <ul class="info-list">',
    '                <li><span>Sitemap</span><a href="sitemap.xml" target="_blank">sitemap.xml</a></li>',
    '            </ul>',
    '        </aside>',
    '        <main>',
    '            <section class="card">',
    '                <h2>文章列表 (' + articles.length + ' 篇)</h2>',
    '                <div class="search-bar"><input type="text" id="search-input" placeholder="搜索标题或正文..."></div>',
    '                <div class="tag-filter" id="tag-filter"></div>',
    '                <ul class="post-list" id="post-container"></ul>',
    '                <div class="pagination" id="pagination-container"></div>',
    '            </section>',
    '        </main>',
    '    </div>',
    '    <button class="theme-toggle" id="theme-toggle" title="切换深色/浅色模式">🌙</button>',
    '    <button class="back-to-top" id="back-to-top" title="回到顶部">↑</button>',
    '    <script>',
    '        var ARTICLES = ' + articlesJson + ';',
    '        var PAGE_SIZE = 10;',
    '        var currentPage = 1, totalPages = 1, filteredArticles = ARTICLES.slice();',
    '        var activeTag = "", searchQuery = "";',
    '        (function(){var s=localStorage.getItem("blog_theme");if(s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.body.classList.add("dark");document.getElementById("theme-toggle").textContent="☀️";}})();',
    '        document.getElementById("theme-toggle").addEventListener("click",function(){document.body.classList.toggle("dark");document.getElementById("theme-toggle").textContent=document.body.classList.contains("dark")?"☀️":"🌙";localStorage.setItem("blog_theme",document.body.classList.contains("dark")?"dark":"light");});',
    '        window.addEventListener("scroll",function(){document.getElementById("back-to-top").classList.toggle("visible",window.scrollY>300);});',
    '        document.getElementById("back-to-top").addEventListener("click",function(){window.scrollTo({top:0,behavior:"smooth"});});',
    'function renderPosts(posts){var c=document.getElementById("post-container");if(posts.length===0){c.innerHTML=\'<li class="no-results">没有找到匹配的文章</li>\';return;}var html="";posts.forEach(function(a){html+=\'<li class="post-item"><div class="post-item-inner">\';if(a.thumb)html+=\'<a href="\'+a.url+\'" class="post-thumb-link"><img class="post-thumb" src="\'+a.thumb+\'" alt="" loading="lazy" onerror="this.parentElement.style.display=&quot;none&quot;"></a>\';html+=\'<div class="post-body"><div class="post-meta">\'+(a.pinned?\'<span class="pin-badge">📌 置顶</span>\':\'\')+\'<span class="post-date">\'+a.date+\'</span>\';if(a.tagsHtml)html+=\'<div class="post-tags">\'+a.tagsHtml+\'</div>\';html+=\'</div>\';html+=\'<a href="\'+a.url+\'" class="post-title-link">\'+a.title+\'</a>\';if(a.excerpt)html+=\'<div class="post-excerpt">\'+a.excerpt+\'</div>\';html+=\'</div></div></li>\';});c.innerHTML=html;}',
    '        function renderTagFilter(){var tagSet=new Set();ARTICLES.forEach(function(a){a.tags.forEach(function(t){tagSet.add(t);});});var tags=Array.from(tagSet).sort();var html=\'<button class="tag-filter-btn \'+(activeTag===""?"active":"")+\'" data-tag="">全部</button>\';tags.forEach(function(t){html+=\'<button class="tag-filter-btn \'+(activeTag===t?"active":"")+\'" data-tag="\'+t+\'">\'+t+\'</button>\';});document.getElementById("tag-filter").innerHTML=html;document.querySelectorAll(".tag-filter-btn").forEach(function(btn){btn.addEventListener("click",function(){activeTag=btn.dataset.tag;applyFilters();});});}',
    '        function applyFilters(){var issues=ARTICLES.slice();if(activeTag)issues=issues.filter(function(a){return a.tags.indexOf(activeTag)>=0;});if(searchQuery){var q=searchQuery.toLowerCase();issues=issues.filter(function(a){return(a.title||"").toLowerCase().indexOf(q)>=0||(a.excerpt||"").toLowerCase().indexOf(q)>=0;});}filteredArticles=issues;totalPages=Math.ceil(issues.length/PAGE_SIZE);if(currentPage>totalPages)currentPage=Math.max(1,totalPages);changePage(currentPage);}',
    '        function renderPagination(){var c=document.getElementById("pagination-container");c.innerHTML="";if(totalPages<=1)return;var pb=document.createElement("button");pb.textContent="← 上一页";pb.disabled=currentPage===1;pb.className="pagination-btn";pb.onclick=function(){changePage(currentPage-1);};c.appendChild(pb);var s=Math.max(1,currentPage-2),e=Math.min(totalPages,currentPage+2);for(var i=s;i<=e;i++){var b=document.createElement("button");b.className="pagination-btn"+(i===currentPage?" active":"");b.textContent=i;b.onclick=function(p){return function(){changePage(p);};}(i);c.appendChild(b);}var nb=document.createElement("button");nb.className="pagination-btn";nb.textContent="下一页 →";nb.disabled=currentPage===totalPages;nb.onclick=function(){changePage(currentPage+1);};c.appendChild(nb);}',
    '        function changePage(page){if(page<1||page>totalPages)return;currentPage=page;var start=(currentPage-1)*PAGE_SIZE;renderPosts(filteredArticles.slice(start,start+PAGE_SIZE));renderPagination();document.getElementById("post-container").scrollIntoView({behavior:"smooth"});}',
    '        document.getElementById("search-input").addEventListener("input",function(e){searchQuery=e.target.value.trim();currentPage=1;applyFilters();});',
    '        renderTagFilter();applyFilters();',
    '    <\/script>',
    '</body>',
    '</html>'
  ].join('\n');
}
function genPostPage(article, allArticles) {
  var idx = -1;
  for (var i = 0; i < allArticles.length; i++) { if (allArticles[i].id === article.id) { idx = i; break; } }
  var prev = allArticles[idx + 1] || null;
  var next = allArticles[idx - 1] || null;
  var prevHtml, nextHtml;
  if (prev) { prevHtml = '<a href="post-' + prev.id + '.html" class="nav-item nav-prev"><div class="nav-label">← 上一篇</div><div class="nav-title">' + prev.title + '</div></a>'; }
  else { prevHtml = '<div class="nav-item nav-prev"><div class="nav-label">← 上一篇</div><div class="nav-title">没有了</div></div>'; }
  if (next) { nextHtml = '<a href="post-' + next.id + '.html" class="nav-item nav-next"><div class="nav-label">下一篇 →</div><div class="nav-title">' + next.title + '</div></a>'; }
  else { nextHtml = '<div class="nav-item nav-next"><div class="nav-label">下一篇 →</div><div class="nav-title">没有了</div></div>'; }
  var style = genPostStyle();
  var metaDesc = article.excerpt.replace(/"/g, '&quot;');
  var ogTitle = article.title.replace(/"/g, '&quot;');
  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '    <meta charset="UTF-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '    <meta name="description" content="'+metaDesc+'">',
    '    <meta property="og:title" content="'+ogTitle+'">',
    '    <meta property="og:description" content="'+metaDesc+'">',
    '    <title>'+article.title+' - laowei</title>',
    '    <style>' + style + '</style>',
    '</head>',
    '<body>',
    '    <div class="container">',
    '        <div class="card">',
    '            <div class="back"><a href="../index.html">← 返回主页</a></div>',
    '            <div class="article-header">',
    '                <h1 class="title">'+article.title+'</h1>',
    '                <div class="meta">',
    '                    <span class="meta-item">📅 发布于 '+article.dateFormatted+'</span>',
    '                    <span class="meta-item">🔢 Issue #'+article.id+'</span>',
    '                </div>',
    '                <div class="article-tags">'+article.tagsHtml+'</div>',
    '            </div>',
    '            <div class="content">'+article.bodyHtml+'</div>',
    '            <div class="article-nav">',
    '                '+prevHtml,
    '                '+nextHtml,
    '            </div>',
    '        </div>',
    '    </div>',
    '    <button class="theme-toggle" id="theme-toggle" title="切换深色/浅色模式">🌙</button>',
    '    <script>',
    '        (function(){var s=localStorage.getItem("blog_theme");if(s==="dark"||(!s&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.body.classList.add("dark");document.getElementById("theme-toggle").textContent="☀️";}})();',
    '        document.getElementById("theme-toggle").addEventListener("click",function(){document.body.classList.toggle("dark");document.getElementById("theme-toggle").textContent=document.body.classList.contains("dark")?"dark":"light";localStorage.setItem("blog_theme",document.body.classList.contains("dark")?"dark":"light");});',
    '    <\/script>',
    '</body>',
    '</html>'
  ].join('\n');
}
function genSitemap(articles) {
  const base = 'https://' + OWNER + '.github.io/' + REPO;
  const urls = [];
  // 首页节点（完整闭合）
  urls.push(`
  <url>
    <loc>${base}/index.html</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  // 文章节点：补上 </url> 闭合标签
  articles.forEach(function(a) {
    const lastmod = new Date(a.date).toISOString().split('T')[0];
    urls.push(`
  <url>
    <loc>${base}/posts/post-${a.id}.html</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}
async function main() {
  console.log('🚀 开始从 GitHub Issues 生成博客...');
  var issues;
  try {
    issues = await fetchIssues();
  } catch (e) {
    console.error('❌ 获取 Issues 失败:', e.message);
    process.exit(1);
  }
  console.log('📦 获取到 ' + issues.length + ' 篇 Issues');
  var articles = issues.map(buildArticleData);
  articles.sort(function(a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.date) - new Date(a.date);
  });
  // 生成 index.html
  fs.writeFileSync(path.join(__dirname, 'index.html'), genIndex(articles));
  console.log('✅ index.html 已生成');
  // 清理旧的 posts 目录
  var postsDir = path.join(__dirname, POST_DIR);
  if (fs.existsSync(postsDir)) {
    fs.readdirSync(postsDir).forEach(f => {
      fs.unlinkSync(path.join(postsDir, f));
    });
    fs.rmdirSync(postsDir);
  }
  // 生成文章页
  var count = 0;
  articles.forEach(function(a) {
    var dir = path.join(__dirname, POST_DIR);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(dir, 'post-' + a.id + '.html'), genPostPage(a, articles));
    count++;
  });
  console.log('✅ 生成了 ' + count + ' 篇文章页到 ' + POST_DIR + '/ 目录');
  // 生成 sitemap.xml
  fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), genSitemap(articles));
  console.log('✅ sitemap.xml 已生成');
  console.log('🎉 博客生成完成！');
}
main();
