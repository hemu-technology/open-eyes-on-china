function initializeSearch(index) {
  const TITLE_TAG_KEYS = ['title', 'tags'];
  const FULL_KEYS = ['title', 'tags', 'body'];

  const searchPageElement = elem('#searchpage');

  // Build two Fuse instances: lightweight (title+tags) and full (adds body)
  const optionsBase = {
    ignoreLocation: true,
    findAllMatches: true,
    includeScore: true,
    includeMatches: true,
    shouldSort: true,
    threshold: 0.0
  };
  const fuseTitleTags = new Fuse(index, { ...optionsBase, keys: TITLE_TAG_KEYS });
  const fuseFull = new Fuse(index, { ...optionsBase, keys: FULL_KEYS });

  function minQueryLen(query) {
    query = query.trim();
    const queryIsFloat = parseFloat(query);
    // Minimum characters: 2 for non-numeric. We'll still restrict BODY search to 3+ below.
    const minimumQueryLength = queryIsFloat ? 1 : 2;
    return minimumQueryLength;
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildHighlighted(text, matchesForKey, snippetStart = 0, snippetEnd = null) {
    // Build highlighted HTML using match index ranges for a given key
    if (!text) return '';
    const full = text;
    const start = snippetStart || 0;
    const end = snippetEnd == null ? full.length : snippetEnd;
    const slice = full.substring(start, end);
    const safe = escapeHtml(slice);

    if (!matchesForKey || !matchesForKey.length) {
      return safe;
    }

    // Adjust match ranges relative to snippet and merge overlaps
    let ranges = [];
    matchesForKey.forEach(m => {
      let s = m[0], e = m[1];
      if (e < start || s > end) return;
      s = Math.max(0, s - start);
      e = Math.min(end - start, e - start);
      ranges.push([s, e]);
    });
    if (!ranges.length) return safe;
    ranges.sort((a,b)=>a[0]-b[0]);
    const merged = [];
    for (let r of ranges) {
      if (!merged.length || r[0] > merged[merged.length-1][1] + 1) {
        merged.push(r);
      } else {
        merged[merged.length-1][1] = Math.max(merged[merged.length-1][1], r[1]);
      }
    }
    // Build HTML with <mark> over merged ranges
    let out = '';
    let last = 0;
    for (let [s, e] of merged) {
      out += safe.substring(last, s);
      out += '<mark class="search-term">' + safe.substring(s, e + 1) + '</mark>';
      last = e + 1;
    }
    out += safe.substring(last);
    return out;
  }

  function searchResults(results=[], query="", passive = false) {
    let resultsFragment = new DocumentFragment();
    let showResults = elem('.search_results');
    if(passive) {
      showResults = searchPageElement;
    }
    emptyEl(showResults);

    const queryLen = query.length;
    const requiredQueryLen = minQueryLen(query);

    if(results.length && queryLen >= requiredQueryLen) {
      let resultsTitle = createEl('h3');
      resultsTitle.className = 'search_title';
      resultsTitle.innerText = quickLinks;

      let goBackButton = createEl('button');
      goBackButton.textContent = 'Go Back';
      goBackButton.className = goBackClass;
      if(passive) {
        resultsTitle.innerText = searchResultsLabel;
      }
      if(!searchPageElement) {
        results = results.slice(0,8);
      } else {
        resultsFragment.appendChild(goBackButton);
        results = results.slice(0,12);
      }
      resultsFragment.appendChild(resultsTitle);

      results.forEach(function(result){
        let item = createEl('a');
        item.href = `${result.link}?query=${query}`;
        item.className = 'search_result';
        item.style.order = result.sortOrder;

        // Build highlight for title
        const titleMatches = result.matches && result.matches.title ? result.matches.title : [];
        const highlightedTitle = buildHighlighted(result.title || '', titleMatches);

        if(passive) {
          pushClass(item, 'passive');
          let itemTitle = createEl('h3');
          itemTitle.innerHTML = highlightedTitle || escapeHtml(result.title || '');
          item.appendChild(itemTitle);

          let itemDescription = createEl('p');
          // If we have body matches, create a focused snippet around the first
          let snippetHtml = '';
          const bodyMatches = result.matches && result.matches.body ? result.matches.body : [];
          if (result.body && result.body.length) {
            if (bodyMatches.length) {
              const first = bodyMatches[0];
              const s = Math.max(0, first[0] - 60);
              const e = Math.min(result.body.length, first[1] + 140);
              snippetHtml = buildHighlighted(result.body, bodyMatches, s, e);
              if (s > 0) snippetHtml = '…' + snippetHtml;
              if (e < result.body.length) snippetHtml = snippetHtml + '…';
            } else {
              // Fallback substring search without match indices
              const qi = result.body.toLowerCase().indexOf((query||'').toLowerCase());
              const s = qi > 0 ? Math.max(0, qi - 60) : 0;
              const e = Math.min(result.body.length, (qi > -1 ? qi + 140 : 200));
              let raw = escapeHtml(result.body.substring(s, e));
              if (qi > -1) {
                // crude highlight using regex on escaped text
                const q = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                raw = raw.replace(new RegExp(q, 'ig'), function(m){return '<mark class="search-term">'+m+'</mark>'});
              }
              snippetHtml = (s>0?'…':'') + raw + (e<result.body.length?'…':'');
            }
          }
          itemDescription.innerHTML = snippetHtml;
          item.appendChild(itemDescription);
        } else {
          item.innerHTML = highlightedTitle || escapeHtml(result.title || '');
        }
        resultsFragment.appendChild(item);
      });
    }

    if(queryLen >= requiredQueryLen) {
      if (!results.length) {
        showResults.innerHTML = `<span class="search_result">${noMatchesFound}</span>`;
      }
    } else {
      showResults.innerHTML = `<label for="find" class="search_result">${ queryLen > 1 ? shortSearchQuery : typeToSearch }</label>`
    }

    showResults.appendChild(resultsFragment);
  }

  function search(searchTerm, scope = null, passive = false) {
    if(searchTerm.length) {
      const qlen = searchTerm.length;
      // For 1-2 chars: restrict to title/tags; for 3+: include body as well
      let resultsTT = fuseTitleTags.search(searchTerm).map(r=>({
        item: r.item,
        score: r.score,
        matches: r.matches
      }));
      let resultsFull = qlen >= 3 ? fuseFull.search(searchTerm).map(r=>({
        item: r.item,
        score: r.score,
        matches: r.matches
      })) : [];

      // Merge and de-duplicate by link, prefer better (lower) score and title/tags origin
      const byLink = new Map();
      const process = (arr, origin)=>{
        arr.forEach(r=>{
          const link = r.item.link;
          const existing = byLink.get(link);
          const payload = {
            title: r.item.title,
            link: r.item.link,
            body: r.item.body,
            section: r.item.section,
            tags: r.item.tags,
            score: r.score,
            origin,
            // flatten matches by key into positions only
            matches: (r.matches||[]).reduce((acc,m)=>{
              const key = m.key; // fuse sets key
              if(!acc[key]) acc[key] = [];
              // indices is array of [start,end]
              (m.indices||[]).forEach(pair=>acc[key].push(pair));
              return acc;
            }, {})
          };
          if(!existing || (payload.origin === 'titleTags' && existing.origin !== 'titleTags') || (existing.score > payload.score)){
            byLink.set(link, payload);
          }
        })
      };
      process(resultsTT, 'titleTags');
      process(resultsFull, 'full');

      let merged = Array.from(byLink.values());

      if(scope) {
        merged = merged.filter(resultItem => {
          return resultItem.section == scope;
        });
      }

      // Compute a sortOrder for CSS ordering: prioritize titleTags results, then by score
      merged.forEach(r=>{
        const base = r.origin === 'titleTags' ? 0 : 10; // title/tags before body
        r.sortOrder = Math.round((base + (parseFloat(r.score||0) * 50)));
      });

      passive ? searchResults(merged, searchTerm, true) : searchResults(merged, searchTerm);

    } else {
      passive ? searchResults([], "", true) : searchResults();
    }
  }

  function liveSearch() {
    const searchField = elem(searchFieldClass);

    if (searchField) {
      const searchScope = searchField.dataset.scope;
      searchField.addEventListener('input', function() {
        const searchTerm = searchField.value.trim().toLowerCase();
        search(searchTerm, searchScope);
      });

      if(!searchPageElement) {
        searchField.addEventListener('search', function(){
          const searchTerm = searchField.value.trim().toLowerCase();
          if(searchTerm.length)  {
            const scopeParameter = searchScope ? `&scope=${searchScope}` : '';
            window.location.href = new URL(baseURL + `search/?query=${searchTerm}${ scopeParameter }`).href;
          }
        });
      }
    }
  }

  function passiveSearch() {
    if(searchPageElement) {
      const searchTerm = findQuery();
      const searchScope = findQuery('scope');
      // search actively after search page has loaded
      const searchField = elem(searchFieldClass);

      search(searchTerm, searchScope, true);

      if(searchField) {
        searchField.addEventListener('input', function() {
          const searchTerm = searchField.value.trim().toLowerCase();
          search(searchTerm, true);
          wrapText(searchTerm, main);
        });
      }
    }
  }

  function hasSearchResults() {
    const searchResults = elem('.results');
    if(searchResults) {
        const body = searchResults.innerHTML.length;
        return [searchResults, body];
    }
    return false
  }

  function clearSearchResults() {
    let searchResults = hasSearchResults();
    if(searchResults) {
      searchResults = searchResults[0];
      searchResults.innerHTML = "";
      // clear search field
      const searchField = elem(searchFieldClass);
      searchField.value = "";
    }
  }

  function onEscape(fn){
    window.addEventListener('keydown', function(event){
      if(event.code === "Escape") {
        fn();
      }
    });
  }

  let main = elem('main');
  if(!main) {
    main = elem('.main');
  }

  searchPageElement ? false : liveSearch();
  passiveSearch();

  highlightSearchTerms(findQuery(), '.post_body', 'mark', 'search-term');

  onEscape(clearSearchResults);

  window.addEventListener('click', function(event){
    const target = event.target;
    const isSearch = target.closest(searchClass) || target.matches(searchClass);
    if(!isSearch && !searchPageElement) {
      clearSearchResults();
    }
  });
}

function highlightSearchTerms(search, context, wrapper = 'mark', cssClass = '') {
  const query = findQuery()
  if(query){

    let container = elem(context);
    let reg = new RegExp("(" + search + ")", "gi");

    function searchInNode(parentNode, search) {
      forEach(parentNode, function (node) {
        if (node.nodeType === 1) {
          searchInNode(node, search);
        } else if (
          node.nodeType === 3 &&
          reg.test(node.nodeValue)
        ) {
          let string = node.nodeValue.replace(reg, `<${wrapper} class="${cssClass}">$1</${wrapper}>`);
          let span = document.createElement("span");
          span.dataset.searched = "true";
          span.innerHTML = string;
          parentNode.replaceChild(span, node);
        }
      });
    };

    searchInNode(container, search);

  }
}

// Allow this script to be loaded lazily after initial page render.
(function(){
  if(window.__SEARCH_INIT) return; // guard in case of double inject
  window.__SEARCH_INIT = true;
  function boot(){
    try {
      const body = elem('body');
      if(!body){ return; }
      const pageLanguage = body.dataset.lang;
      const searchIndexLangSlug = pageLanguage === defaultSiteLanguage ? '' : `${pageLanguage}/`;
      let searchIndex = `${searchIndexLangSlug}index.json`;
      searchIndex = new URL(`${baseURL}${searchIndex}`).href;
      fetch(searchIndex)
        .then(r=>r.json())
        .then(function(data){ initializeSearch(Array.isArray(data)?data:[]); })
        .catch(function(err){ console.error('[search] index load failed', err); });
    } catch(e){ console.error('[search] init error', e); }
  }
  if(document.readyState === 'complete') boot(); else window.addEventListener('load', boot, { once: true });
})();
