(function () {
  // Cloud Firestore REST endpoint (public, no API key or secrets). The security rules only
  // allow creating responses/{id} once with validated fields; nothing can be listed.
  var PROJECT = "cousins-ai";
  var BASE = "https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents/responses";
  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.search);
  var rid = q.get("r") || "";
  var who = (q.get("n") || "").trim().slice(0, 40);

  if (!/^[A-Za-z0-9_-]{22,64}$/.test(rid)) {
    $("form-card").classList.add("hidden");
    $("bad-card").classList.remove("hidden");
    return;
  }
  if (who) {
    $("title").textContent = "Hi " + who + "! 🎉";
    $("name").value = who;
  }
  MONTHS.forEach(function (m, i) { var o = document.createElement("option"); o.value = i + 1; o.textContent = m; $("month").appendChild(o); });
  function fillDays() {
    var m = +$("month").value || 1, keep = $("day").value;
    var max = [31,29,31,30,31,30,31,31,30,31,30,31][m - 1];
    $("day").length = 1;
    for (var d = 1; d <= max; d++) { var o = document.createElement("option"); o.value = d; o.textContent = d; $("day").appendChild(o); }
    if (keep && +keep <= max) $("day").value = keep;
  }
  fillDays();
  $("month").addEventListener("change", fillDays);

  function err(msg) { $("err").textContent = msg || ""; }

  $("f").addEventListener("submit", function (e) {
    e.preventDefault();
    err("");
    var name = $("name").value.trim().replace(/\s+/g, " ");
    var month = +$("month").value, day = +$("day").value;
    var yr = $("year").value.trim();
    if (!name) return err("Please add your name.");
    if (!month || !day) return err("Please pick your birthday month and day.");
    var year = null;
    if (yr) {
      year = +yr;
      var nowY = new Date().getFullYear();
      if (!/^\d{4}$/.test(yr) || year < 1900 || year > nowY) return err("Year should look like 1985, or leave it blank.");
      var dt = new Date(year, month - 1, day);
      if (dt.getMonth() !== month - 1) return err("That date doesn't exist in " + year + ".");
    }
    var now = new Date();
    var fields = {
      name: { stringValue: name.slice(0, 80) },
      month: { integerValue: String(month) },
      day: { integerValue: String(day) },
      createdAt: { timestampValue: now.toISOString() },
      expireAt: { timestampValue: new Date(now.getTime() + 60 * 864e5).toISOString() }
    };
    if (year) fields.year = { integerValue: String(year) };
    var likes = $("likes").value.trim().slice(0, 500), gifts = $("gifts").value.trim().slice(0, 500);
    if (likes) fields.likes = { stringValue: likes };
    if (gifts) fields.giftIdeas = { stringValue: gifts };

    $("go").disabled = true; $("go").textContent = "Sending…";
    fetch(BASE + "?documentId=" + encodeURIComponent(rid), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: fields })
    }).then(function (r) {
      if (r.ok) return done(name);
      if (r.status === 409 || r.status === 403) {
        // Already answered (create is only allowed once) or link cancelled.
        return r.text().then(function (t) {
          if (/ALREADY_EXISTS/.test(t)) return done(name, true);
          throw new Error("rejected");
        });
      }
      throw new Error("http " + r.status);
    }).catch(function () {
      $("go").disabled = false; $("go").textContent = "Send my birthday 🎉";
      err("Couldn't send just now. Check your connection and try again.");
    });
  });

  function done(name, already) {
    $("form-card").classList.add("hidden");
    $("done-card").classList.remove("hidden");
    var first = name.split(" ")[0];
    $("done-msg").textContent = already
      ? "This link was already answered, so you're all set, " + first + "! 💚"
      : "Thanks, " + first + "! Your birthday is on its way. Expect a happy birthday this year 💚";
    window.scrollTo(0, 0);
  }
})();
