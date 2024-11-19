module.exports = function initPreload(preloadData) {
  function parseQueryParams(queryString) {
    const params = new URLSearchParams(queryString);
    return Object.fromEntries(params);
  }

  function getXid() {
    var params = parseQueryParams(window.location.search);
    return params.xid;
  }
  function get_x_profile_image_url() {
    var params = parseQueryParams(window.location.search);
    return params.x_profile_image_url;
  }
  function get_x_name() {
    var params = parseQueryParams(window.location.search);
    return params.x_name;
  }
  function get_domain_whitelist_override_key() {
    var params = parseQueryParams(window.location.search);
    return params.dwok;
  }
  function getUiLang() {
    var params = parseQueryParams(window.location.search);
    return params.ui_lang;
  }

  function ajaxGet(url, success, fail) {
    var xmlhttp;
    xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState == XMLHttpRequest.DONE ) {
        if(xmlhttp.status == 200){
          success(JSON.parse(xmlhttp.responseText));
        } else {
          fail(xmlhttp.status, xmlhttp.responseText);
        }
      }
    }

    xmlhttp.open("GET", url, true);
    xmlhttp.send();
  }

  function fixupConversation(conversation) {
    if (!conversation) return {};  // Guard against null/undefined
    var translations = conversation.translations || [];  // Default to empty array if no translations
    if (translations.length) {
      conversation.topic = translations[0].topic;
      conversation.description = translations[0].description;
    }
    return conversation;
  }

  function onPreloadOk(response) {
    var things = [
      {src:"nextComment", dst:"firstComment", cb:"firstCommentListener"},
      {src:"conversation", dst:"firstConv", cb:"firstConvListener", fn:fixupConversation},
      {src:"user", dst:"firstUser", cb:"firstUserListener"},
      {src:"ptpt", dst:"firstPtpt", cb:"firstPtptListener"},
      {src:"votes", dst:"firstVotesByMe", cb:"firstVotesByMeListener"},
      {src:"pca", dst:"firstMath", cb:"firstMathListener", JSON: true},
      {src:"famous", dst:"firstFamous", cb:"firstFamousListener"},
      {src:"acceptLanguage", dst:"acceptLanguage", cb:"acceptLanguageListener"},
    ];
    for (var i = 0; i < things.length; i++) {
      var mapping = things[i], src = mapping.src, dst = mapping.dst, cb = mapping.cb;

      if (response) {
        preloadData[dst] = mapping.JSON ? JSON.parse(response[src]) : response[src];
      }

      if (mapping.fn) {
        preloadData[dst] = mapping.fn(preloadData[dst]);
      }

      // weird issue probably due to setting a prop named bgcolor on a global?
      // manually set the prop
      if (response && response[src] && response[src].bgcolor) {
        preloadData[dst].bgcolor = response[src].bgcolor;
      }

      if (preloadData[cb]) {
        preloadData[cb](0, preloadData[dst]);
      }
    }
  }

  function onPreloadFail(statusCode, failResponse) {
    var cbs = [
      "firstCommentListener",
      "firstConvListener",
      "firstUserListener",
      "firstPtptListener",
      "firstVotesByMeListener",
      "firstMathListener",
      "firstFamousListener",
      "acceptLanguageListener",
    ];
    for (var i = 0; i < cbs.length; i++) {
      if (preloadData[cbs[i]]) {
        preloadData[cbs[i]](1);
      }
    }
    if (statusCode === 403 && failResponse.match(/^polis_err_domain/)) {
      function updateDomainMessage() {
        var el = document.getElementById("badDomainMessage");
        if (el) {
          el.className = el.className.replace( /(?:^|\s)displaynone(?!\S)/g , '');
          document.getElementById("mainSpinner").className += " displaynone";
          clearInterval(updateDomainIntervalRef);
        }
      }
      var updateDomainIntervalRef = setInterval(updateDomainMessage, 100);
    }
  }

  var path = document.location.pathname;
  var shouldPreload =
    path.match(/^([0-9][0-9A-Za-z]+)/) ||
    path.match(/^ot\/([0-9][0-9A-Za-z]+)/) ||
    path.match(/^demo\/([0-9][0-9A-Za-z]+)/) ||
    path.match(/^share\/([0-9][0-9A-Za-z]+)$/) ||
    path.match(/^m\/([0-9][0-9A-Za-z]+)\/?(.*)$/);

  window.xsThresh = 600; // nexus 7

  window.getPtptoiLimitForWidth = function(w) {
    return w < window.xsThresh ? 25 : void 0;
  };

  var queryParams = [];
  if (preloadData.conversation && preloadData.conversation.conversation_id) {
    queryParams.push("conversation_id=" + preloadData.conversation.conversation_id);
  }
  queryParams.push("pid=mypid");

  var xid = getXid();
  if (typeof xid !== "undefined") {
    window.preload.xid = xid;
    queryParams.push("xid=" + encodeURIComponent(xid));
  }
  var x_profile_image_url = get_x_profile_image_url();
  if (typeof x_profile_image_url !== "undefined") {
    window.preload.x_profile_image_url = x_profile_image_url;
    queryParams.push("x_profile_image_url=" + encodeURIComponent(x_profile_image_url));
  }
  var x_name = get_x_name();
  if (typeof x_name !== "undefined") {
    window.preload.x_name = x_name;
    queryParams.push("x_name=" + encodeURIComponent(x_name));
  }
  var dwok = get_domain_whitelist_override_key();
  if (typeof dwok !== "undefined") {
    queryParams.push("domain_whitelist_override_key=" + encodeURIComponent(dwok));
  }

  var ui_lang = getUiLang();
  if (ui_lang) {
    queryParams.push("lang=" + ui_lang);
    window.ui_lang = ui_lang;
  } else {
    queryParams.push("lang=acceptLang");
  }

  var queryParams = queryParams.join("&");
  queryParams = queryParams.length > 1 ? ("?" + queryParams) : "";

  ajaxGet("/api/v3/participationInit" + queryParams,
    onPreloadOk,
    onPreloadFail);
}

// Auto-initialize if we're in a browser
if (typeof window !== 'undefined') {
  initPreload(window.preload);
}
