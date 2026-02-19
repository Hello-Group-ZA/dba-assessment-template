/* ==========================================================================
   DBA Assessment -- Single Page Application
   Fetches progress.json and step content, renders the assessment dashboard.

   NOTE: All dynamic content is sourced from local JSON files (progress.json
   and step-NN.json) that are committed to this repository. No external or
   user-supplied HTML is ever injected. Text values from JSON are escaped
   via escapeHtml() before insertion.
   ========================================================================== */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  var REFRESH_INTERVAL_MS = 60 * 1000;
  var TOTAL_POINTS = 50;
  var TOTAL_STEPS = 6;
  var TIME_LIMIT_HOURS = 24;

  var STEP_META = {
    1: { title: 'Connect and Document Schema',       tier: 'Fundamentals', points: 8  },
    2: { title: 'Install MySQL and Set Up Replication', tier: 'Fundamentals', points: 10 },
    3: { title: 'Backups and Point-in-Time Recovery', tier: 'Operational',   points: 8  },
    4: { title: 'Security and Performance Fixes',     tier: 'Operational',   points: 8  },
    5: { title: 'Query Optimization and Production Tuning', tier: 'Advanced', points: 8  },
    6: { title: 'Monitoring and Failover',            tier: 'Advanced',      points: 8  },
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var progressData = null;
  var stepContentCache = {};
  var timerInterval = null;

  // ---------------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------------
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    setRepoLinks();
    loadProgress().then(function () {
      render();
      startTimer();
      setInterval(refreshProgress, REFRESH_INTERVAL_MS);
    });
  });

  /**
   * Compute the GitHub repo URL from the Pages URL and update all repo links.
   * Pages URL: https://{org}.github.io/{repo}/
   * Repo URL:  https://github.com/{org}/{repo}
   */
  function setRepoLinks() {
    var host = location.hostname; // e.g. "hello-group-za.github.io"
    var parts = location.pathname.split('/').filter(Boolean); // e.g. ["dba-assessment-sanya-rajan"]
    if (!host.endsWith('.github.io') || parts.length === 0) return;
    var org = host.replace('.github.io', '');
    var repo = parts[0];
    var repoUrl = 'https://github.com/' + org + '/' + repo;
    var actionsUrl = repoUrl + '/actions';

    var repoLink = $('#repo-link');
    if (repoLink) repoLink.href = repoUrl;

    // Store for use by the "Go to Actions" CTA rendered later
    window._actionsUrl = actionsUrl;
  }

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------
  function loadProgress() {
    return fetch('progress.json?_t=' + Date.now())
      .then(function (resp) {
        if (!resp.ok) throw new Error('Failed to fetch progress.json');
        return resp.json();
      })
      .then(function (data) {
        progressData = data;
      })
      .catch(function (err) {
        console.error('[DBA Assessment] Could not load progress:', err);
        progressData = null;
      });
  }

  function refreshProgress() {
    var expandedCard = document.querySelector('.step-card.expanded');
    var expandedStep = expandedCard ? expandedCard.dataset.step : null;

    loadProgress().then(function () {
      render();

      if (expandedStep) {
        var card = document.querySelector('.step-card[data-step="' + expandedStep + '"]');
        if (card && !card.classList.contains('step-locked')) {
          card.classList.add('expanded');
          var stepNum = parseInt(expandedStep, 10);
          var bodyEl = card.querySelector('.step-card-body');
          if (bodyEl && !bodyEl.querySelector('.step-content')) {
            fetchStepContent(stepNum).then(function (content) {
              if (content) renderStepBody(bodyEl, content);
            });
          }
        }
      }
    });
  }

  function fetchStepContent(stepNum) {
    if (stepContentCache[stepNum]) {
      return Promise.resolve(stepContentCache[stepNum]);
    }
    return fetch('steps/step-' + String(stepNum).padStart(2, '0') + '.json?_t=' + Date.now())
      .then(function (resp) {
        if (!resp.ok) throw new Error('Step content not found');
        return resp.json();
      })
      .then(function (data) {
        stepContentCache[stepNum] = data;
        return data;
      })
      .catch(function (err) {
        console.warn('[DBA Assessment] Could not load step ' + stepNum + ' content:', err);
        return null;
      });
  }

  // ---------------------------------------------------------------------------
  // Timer
  // ---------------------------------------------------------------------------
  function startTimer() {
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
  }

  function updateTimer() {
    var el = $('#timer-value');
    if (!el) return;
    var timerContainer = $('#timer');

    if (!progressData || !progressData.started_at) {
      el.textContent = 'Not started';
      return;
    }

    var started = new Date(progressData.started_at);
    var now = new Date();
    var elapsed = now - started;
    var remaining = (TIME_LIMIT_HOURS * 3600 * 1000) - elapsed;

    if (remaining <= 0) {
      el.textContent = 'Time expired';
      if (timerContainer) timerContainer.className = 'timer critical';
      return;
    }

    var totalSec = Math.floor(elapsed / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    el.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);

    var hoursRemaining = remaining / (3600 * 1000);
    if (timerContainer) {
      if (hoursRemaining < 1) {
        timerContainer.className = 'timer critical';
      } else if (hoursRemaining < 4) {
        timerContainer.className = 'timer warning';
      } else {
        timerContainer.className = 'timer';
      }
    }
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  function render() {
    renderInfoBar();
    renderConnectionDetails();
    renderProgress();
    renderSteps();
    renderFooter();
  }

  function renderInfoBar() {
    var el = $('#info-bar-content');
    if (!el) return;

    // Clear existing content
    while (el.firstChild) el.removeChild(el.firstChild);

    if (!progressData || !progressData.started_at) {
      var span = document.createElement('span');
      span.className = 'info-item';
      var label = document.createElement('span');
      label.className = 'label';
      label.textContent = 'Status:';
      var value = document.createElement('span');
      value.className = 'value';
      value.textContent = 'Awaiting provisioning';
      span.appendChild(label);
      span.appendChild(document.createTextNode(' '));
      span.appendChild(value);
      el.appendChild(span);
      return;
    }

    var candidateName = progressData.candidate || progressData.github_actor || progressData.candidate_id;
    if (candidateName) {
      var item1 = createInfoItem('Candidate:', candidateName);
      el.appendChild(item1);
    }
    if (progressData.started_at) {
      var d = new Date(progressData.started_at);
      var item2 = createInfoItem('Started:', d.toLocaleString());
      el.appendChild(item2);
    }
  }

  function renderConnectionDetails() {
    var section = $('#connection-section');
    var container = $('#connection-details');
    if (!section || !container) return;

    var env = progressData && progressData.environment;
    if (!env || !env.primary_ip) {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';
    while (container.firstChild) container.removeChild(container.firstChild);

    // Header
    var h3 = document.createElement('h3');
    h3.textContent = 'Connection Details';
    container.appendChild(h3);

    // IP grid
    var grid = document.createElement('div');
    grid.className = 'connection-grid';
    grid.appendChild(buildConnectionItem('Primary', env.primary_ip, env.primary_private_ip));
    if (env.replica_1_ip) grid.appendChild(buildConnectionItem('Replica 1', env.replica_1_ip, env.replica_1_private_ip));
    if (env.replica_2_ip) grid.appendChild(buildConnectionItem('Replica 2', env.replica_2_ip, env.replica_2_private_ip));
    container.appendChild(grid);

    // SSH instructions
    var sshInfo = document.createElement('div');
    sshInfo.style.cssText = 'margin-top: 0.75rem; font-size: 0.8125rem; color: var(--text-secondary);';

    var keyInstr = document.createElement('p');
    keyInstr.style.marginBottom = '0.5rem';
    var keyText = document.createTextNode('Download your SSH key from the ');
    var keyLink = document.createElement('a');
    keyLink.textContent = 'provisioning workflow artifacts';
    keyLink.href = (window._actionsUrl || '#') + '/workflows/Provision+Assessment+Environment';
    keyLink.target = '_blank';
    keyLink.rel = 'noopener';
    keyInstr.appendChild(keyText);
    keyInstr.appendChild(keyLink);
    keyInstr.appendChild(document.createTextNode('. Click on the completed run, then download the '));
    var bold = document.createElement('strong');
    bold.textContent = 'ssh-key';
    keyInstr.appendChild(bold);
    keyInstr.appendChild(document.createTextNode(' artifact.'));
    sshInfo.appendChild(keyInstr);

    var pre = document.createElement('pre');
    pre.style.cssText = 'background: var(--bg-primary); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.75rem 1rem; font-size: 0.8125rem; overflow-x: auto;';
    var code = document.createElement('code');
    code.textContent = 'chmod 600 ssh-key.pem\nssh -i ssh-key.pem ubuntu@' + env.primary_ip;
    pre.appendChild(code);
    sshInfo.appendChild(pre);

    container.appendChild(sshInfo);
  }

  function buildConnectionItem(label, ip, privateIp) {
    var item = document.createElement('div');
    item.className = 'connection-item';
    var labelEl = document.createElement('span');
    labelEl.className = 'conn-label';
    labelEl.textContent = label;
    var valueEl = document.createElement('span');
    valueEl.className = 'conn-value';
    valueEl.textContent = ip;
    item.appendChild(labelEl);
    item.appendChild(valueEl);
    if (privateIp) {
      var privLabel = document.createElement('span');
      privLabel.className = 'conn-label';
      privLabel.textContent = 'Private';
      var privValue = document.createElement('span');
      privValue.className = 'conn-value conn-value-secondary';
      privValue.textContent = privateIp;
      item.appendChild(privLabel);
      item.appendChild(privValue);
    }
    return item;
  }

  function createInfoItem(labelText, valueText) {
    var span = document.createElement('span');
    span.className = 'info-item';
    var label = document.createElement('span');
    label.className = 'label';
    label.textContent = labelText;
    var value = document.createElement('span');
    value.className = 'value';
    value.textContent = valueText;
    span.appendChild(label);
    span.appendChild(document.createTextNode(' '));
    span.appendChild(value);
    return span;
  }

  function renderProgress() {
    if (!progressData) return;

    var steps = progressData.steps || {};
    var completedCount = 0;
    var totalScore = 0;

    Object.keys(steps).forEach(function (key) {
      if (steps[key].status === 'completed') {
        completedCount++;
        totalScore += steps[key].score || 0;
      }
    });

    var pct = Math.round((completedCount / TOTAL_STEPS) * 100);

    var fill = $('#progress-fill');
    if (fill) fill.style.width = pct + '%';

    var statsEl = $('#progress-stats');
    if (statsEl) {
      statsEl.textContent = '';
      statsEl.appendChild(document.createTextNode(completedCount + '/' + TOTAL_STEPS + ' steps \u00B7 '));
      var scoreSpan = document.createElement('span');
      scoreSpan.className = 'score';
      scoreSpan.textContent = totalScore + '/' + TOTAL_POINTS + ' pts';
      statsEl.appendChild(scoreSpan);
    }
  }

  function renderSteps() {
    var container = $('#steps-list');
    if (!container) return;

    // Clear existing content
    while (container.firstChild) container.removeChild(container.firstChild);

    if (!progressData || !progressData.started_at) {
      var notStarted = document.createElement('div');
      notStarted.className = 'not-started';
      var heading = document.createElement('h2');
      heading.textContent = 'Assessment Not Yet Started';
      var desc = document.createElement('p');
      desc.textContent = 'Your environment has not been provisioned yet. Go to the Actions tab in your GitHub repository and run the provisioning workflow to begin.';
      var cta = document.createElement('a');
      cta.className = 'cta';
      cta.href = window._actionsUrl || '#';
      cta.id = 'actions-link';
      cta.textContent = 'Go to Actions \u2192';
      notStarted.appendChild(heading);
      notStarted.appendChild(desc);
      notStarted.appendChild(cta);
      container.appendChild(notStarted);
      return;
    }

    var steps = progressData.steps || {};

    for (var i = 1; i <= TOTAL_STEPS; i++) {
      var step = steps[String(i)] || { status: 'locked' };
      var meta = STEP_META[i];
      var status = step.status || 'locked';
      var card = buildStepCard(i, meta, step, status);
      container.appendChild(card);
    }
  }

  function buildStepCard(num, meta, stepData, status) {
    var card = document.createElement('div');
    card.className = 'step-card step-' + status + ' fade-in';
    card.dataset.step = num;

    // Header
    var header = document.createElement('div');
    header.className = 'step-card-header';
    header.addEventListener('click', handleStepToggle);

    var numEl = document.createElement('div');
    numEl.className = 'step-number';
    numEl.textContent = num;

    var info = document.createElement('div');
    info.className = 'step-card-info';

    var title = document.createElement('div');
    title.className = 'step-card-title';
    title.textContent = meta.title;

    var subtitle = document.createElement('div');
    subtitle.className = 'step-card-subtitle';
    var scoreText = (stepData.score !== null && stepData.score !== undefined)
      ? stepData.score + '/' + meta.points
      : meta.points + ' pts';
    subtitle.textContent = meta.tier + ' \u00B7 ' + scoreText;

    info.appendChild(title);
    info.appendChild(subtitle);

    var badge = document.createElement('span');
    badge.className = 'step-badge badge-' + status;
    var badgeIcon = '';
    if (status === 'locked') badgeIcon = '\uD83D\uDD12 ';
    else if (status === 'completed') badgeIcon = '\u2713 ';
    else if (status === 'active') badgeIcon = '\u25B6 ';
    badge.textContent = badgeIcon + status.charAt(0).toUpperCase() + status.slice(1);

    var chevron = document.createElement('span');
    chevron.className = 'step-chevron';
    chevron.textContent = '\u276F';

    header.appendChild(numEl);
    header.appendChild(info);
    header.appendChild(badge);
    header.appendChild(chevron);

    // Body
    var body = document.createElement('div');
    body.className = 'step-card-body';
    var loading = document.createElement('div');
    loading.className = 'step-content-loading loading-pulse';
    loading.textContent = 'Loading step content...';
    body.appendChild(loading);

    card.appendChild(header);
    card.appendChild(body);

    return card;
  }

  function renderFooter() {
    var el = $('#refresh-time');
    if (el) {
      el.textContent = 'Last updated: ' + new Date().toLocaleTimeString() + ' (auto-refreshes every 60s)';
    }
  }

  // ---------------------------------------------------------------------------
  // Step expansion
  // ---------------------------------------------------------------------------
  function handleStepToggle(e) {
    var card = e.currentTarget.closest('.step-card');
    if (!card || card.classList.contains('step-locked')) return;

    var isExpanded = card.classList.contains('expanded');

    // Collapse all cards
    $$('.step-card.expanded').forEach(function (c) { c.classList.remove('expanded'); });

    if (isExpanded) return;

    card.classList.add('expanded');

    var stepNum = parseInt(card.dataset.step, 10);
    var bodyEl = $('.step-card-body', card);

    // If content already rendered, skip fetch
    if (bodyEl.querySelector('.step-content')) return;

    fetchStepContent(stepNum).then(function (content) {
      // Clear body
      while (bodyEl.firstChild) bodyEl.removeChild(bodyEl.firstChild);

      if (!content) {
        var errDiv = document.createElement('div');
        errDiv.className = 'step-content';
        var errP = document.createElement('p');
        errP.textContent = 'Step content could not be loaded. Please check back later.';
        errDiv.appendChild(errP);
        bodyEl.appendChild(errDiv);
        return;
      }

      renderStepBody(bodyEl, content);
    });
  }

  function renderStepBody(container, content) {
    // Meta boxes
    var metaDiv = document.createElement('div');
    metaDiv.className = 'step-meta';
    metaDiv.appendChild(buildMetaBox('Tier', content.tier || ''));
    metaDiv.appendChild(buildMetaBox('Est. Time', content.estimated_time || ''));
    metaDiv.appendChild(buildMetaBox('Points', String(content.points || 0)));
    container.appendChild(metaDiv);

    // Objectives
    if (content.objectives && content.objectives.length) {
      var objHeading = document.createElement('div');
      objHeading.className = 'section-heading';
      objHeading.textContent = 'Objectives';
      container.appendChild(objHeading);

      var objList = document.createElement('ul');
      objList.className = 'objectives-list';
      content.objectives.forEach(function (obj) {
        var li = document.createElement('li');
        li.textContent = obj;
        objList.appendChild(li);
      });
      container.appendChild(objList);
    }

    // Instructions (rendered as sanitized HTML from our own markdown)
    // Content source: local step-NN.json files committed to this repo
    if (content.instructions) {
      var instructDiv = document.createElement('div');
      instructDiv.className = 'step-content';
      instructDiv.appendChild(renderMarkdownToDOM(content.instructions));
      container.appendChild(instructDiv);
    }

    // Deliverables
    if (content.deliverables && content.deliverables.length) {
      var delHeading = document.createElement('div');
      delHeading.className = 'section-heading';
      delHeading.textContent = 'Deliverables';
      container.appendChild(delHeading);

      var delList = document.createElement('ul');
      delList.className = 'deliverables-list';
      content.deliverables.forEach(function (d) {
        var li = document.createElement('li');
        li.textContent = d;
        delList.appendChild(li);
      });
      container.appendChild(delList);
    }

    // Hints
    if (content.hints && content.hints.length) {
      var hintHeading = document.createElement('div');
      hintHeading.className = 'section-heading';
      hintHeading.textContent = 'Hints';
      container.appendChild(hintHeading);

      var hintList = document.createElement('ul');
      hintList.className = 'hints-list';
      content.hints.forEach(function (h) {
        var li = document.createElement('li');
        li.textContent = h;
        hintList.appendChild(li);
      });
      container.appendChild(hintList);
    }
  }

  function buildMetaBox(label, value) {
    var box = document.createElement('div');
    box.className = 'step-meta-item';
    var labelEl = document.createElement('div');
    labelEl.className = 'meta-label';
    labelEl.textContent = label;
    var valueEl = document.createElement('div');
    valueEl.className = 'meta-value';
    valueEl.textContent = value;
    box.appendChild(labelEl);
    box.appendChild(valueEl);
    return box;
  }

  // ---------------------------------------------------------------------------
  // Minimal Markdown-to-DOM renderer
  // All text content is set via textContent (safe). Only structural HTML
  // elements are created via createElement. The source is our own step-content
  // JSON files, not user input.
  // ---------------------------------------------------------------------------
  function renderMarkdownToDOM(md) {
    var fragment = document.createDocumentFragment();
    var lines = md.split('\n');
    var inCodeBlock = false;
    var codeLines = [];
    var listItems = [];
    var listType = '';
    var tableRows = [];
    var inTable = false;

    function flushList() {
      if (listItems.length === 0) return;
      var ul = document.createElement(listType);
      listItems.forEach(function (text) {
        var li = document.createElement('li');
        appendInlineFormatted(li, text);
        ul.appendChild(li);
      });
      fragment.appendChild(ul);
      listItems = [];
      listType = '';
    }

    function flushTable() {
      if (tableRows.length === 0) return;
      var table = document.createElement('table');
      tableRows.forEach(function (row, idx) {
        var cells = row.split('|').filter(function (c, ci, arr) { return ci > 0 && ci < arr.length - 1; });
        var tr = document.createElement('tr');
        cells.forEach(function (cell) {
          var tag = idx === 0 ? 'th' : 'td';
          var td = document.createElement(tag);
          appendInlineFormatted(td, cell.trim());
          tr.appendChild(td);
        });
        if (idx === 0) {
          var thead = document.createElement('thead');
          thead.appendChild(tr);
          table.appendChild(thead);
          var tbody = document.createElement('tbody');
          table.appendChild(tbody);
        } else {
          table.querySelector('tbody').appendChild(tr);
        }
      });
      fragment.appendChild(table);
      tableRows = [];
      inTable = false;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      // Code blocks
      if (line.trim().indexOf('```') === 0) {
        if (inCodeBlock) {
          var pre = document.createElement('pre');
          var code = document.createElement('code');
          code.textContent = codeLines.join('\n');
          pre.appendChild(code);
          fragment.appendChild(pre);
          codeLines = [];
          inCodeBlock = false;
        } else {
          flushList();
          if (inTable) flushTable();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Table rows
      if (line.trim().match(/^\|.*\|$/)) {
        flushList();
        if (line.trim().match(/^\|[\s\-:|]+\|$/)) continue;
        if (!inTable) inTable = true;
        tableRows.push(line.trim());
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Horizontal rule
      if (line.trim().match(/^-{3,}$/) || line.trim().match(/^\*{3,}$/)) {
        flushList();
        fragment.appendChild(document.createElement('hr'));
        continue;
      }

      // Headings
      var headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushList();
        var level = headingMatch[1].length;
        var h = document.createElement('h' + level);
        appendInlineFormatted(h, headingMatch[2]);
        fragment.appendChild(h);
        continue;
      }

      // Unordered list
      if (line.match(/^\s*[-*]\s+/)) {
        if (listType !== 'ul') { flushList(); listType = 'ul'; }
        listItems.push(line.replace(/^\s*[-*]\s+/, ''));
        continue;
      }

      // Ordered list
      if (line.match(/^\s*\d+\.\s+/)) {
        if (listType !== 'ol') { flushList(); listType = 'ol'; }
        listItems.push(line.replace(/^\s*\d+\.\s+/, ''));
        continue;
      }

      // Empty line (close list)
      if (line.trim() === '') {
        flushList();
        continue;
      }

      // Paragraph
      flushList();
      var p = document.createElement('p');
      appendInlineFormatted(p, line);
      fragment.appendChild(p);
    }

    flushList();
    if (inCodeBlock) {
      var preFinal = document.createElement('pre');
      var codeFinal = document.createElement('code');
      codeFinal.textContent = codeLines.join('\n');
      preFinal.appendChild(codeFinal);
      fragment.appendChild(preFinal);
    }
    if (inTable) flushTable();

    return fragment;
  }

  /**
   * Appends inline-formatted text to a parent element.
   * Handles: `code`, **bold**, *italic*, [links](url), and -- (em dash).
   * Uses DOM methods (createElement/textContent) rather than innerHTML.
   */
  function appendInlineFormatted(parent, text) {
    // Replace -- with em dash for easier splitting
    text = text.replace(/ -- /g, ' \u2014 ');

    // Tokenize: split on inline code, bold, italic, links
    var regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|\[[^\]]+\]\([^)]+\))/;
    var parts = text.split(regex);

    parts.forEach(function (part) {
      if (!part) return;

      // Inline code
      if (part.match(/^`[^`]+`$/)) {
        var codeEl = document.createElement('code');
        codeEl.textContent = part.slice(1, -1);
        parent.appendChild(codeEl);
        return;
      }

      // Bold **...**
      if (part.match(/^\*\*[^*]+\*\*$/)) {
        var strong = document.createElement('strong');
        strong.textContent = part.slice(2, -2);
        parent.appendChild(strong);
        return;
      }

      // Bold __...__
      if (part.match(/^__[^_]+__$/)) {
        var strong2 = document.createElement('strong');
        strong2.textContent = part.slice(2, -2);
        parent.appendChild(strong2);
        return;
      }

      // Italic *...*
      if (part.match(/^\*[^*]+\*$/)) {
        var em = document.createElement('em');
        em.textContent = part.slice(1, -1);
        parent.appendChild(em);
        return;
      }

      // Link [text](url)
      var linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        var a = document.createElement('a');
        a.textContent = linkMatch[1];
        a.href = linkMatch[2];
        a.target = '_blank';
        a.rel = 'noopener';
        parent.appendChild(a);
        return;
      }

      // Plain text
      parent.appendChild(document.createTextNode(part));
    });
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

})();
