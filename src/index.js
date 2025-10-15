import axios from "axios";

// API base is injected at build time via DefinePlugin as __IPQS_API_BASE__
// Fallback to a placeholder if not injected (development only)
const api = typeof __IPQS_API_BASE__ !== 'undefined' ? __IPQS_API_BASE__ : "https://ipqualityscore.com/api/json/url/REPLACE_ME";
let currentTabUrl;

function getHostFromUrl(url) {
    return url.toString().replace(/^.*\/\/(www\.)?([^\/?#:]+).*$/, '$2').toLowerCase();
};

const getPhishingStatus = async url => {
    try {
        // IPQuality Score API to check webpage
        const response = await axios.get(`${api}/${encodeURIComponent(url)}`);

        $("#cp_loading").css("display", "none");                                // Stop the loader
        
        // Status Image based on if page is phishing or not
        var risk_score = response.data.risk_score;
        switch (response.data.phishing) {
            case false:
                document.getElementById("phishing_status_img").src = "./images/safe-48.png";
                chrome.action.setIcon({path : "./images/icon-safe.png"});
                //Content Review summary
                if (risk_score < 35) {
                    $("#review_summary").html( 
                        "<span class='based-on'>Catch-Phish Advisory: </span>This page seems <span class='good'>safe for browsing</span>, but it is still important to be careful what you submit to this webpage.");}
                else {
                    document.getElementById("phishing_status_img").src = "./images/caution-48.png";
                    chrome.action.setIcon({path : "./images/icon-dangerhis.png"});
                    $("#review_summary").html( 
                        `<span class='based-on'>Catch-Phish Advisory: </span>This page is <span class='bad'>suspicious</span>, meaning in the last 48hrs it has been involved with shady activity. 
                        Give detais with on this domain with extreme discretion.`);}
                break;
            case true:
                document.getElementById("phishing_status_img").src = "./images/danger-48.png";
                chrome.action.setIcon({path : "./images/icon-danger.png"});
                //Content Review summary
                $("#review_summary").html( 
                    "<span class='based-on'>Catch-Phish Advisory: </span>This page is a <span class='bad'>phishing page</span> and is unsafe for any form of detail submission.");
                break;
        };

        //Page/Tab title
        $("#page_title").css("visibility", "visible");

        //Page/Tab Domain name
        $("#page_domain").css("visibility", "visible");

        //Page/Tab IP Address
        $("#page_domain_ip").html("<span class='disabled'>IP Address: -->> </span>"+response.data.ip_address);

        //Page/Tab Risk Score
        if (risk_score > 75) {
            $("#page_domain_risk_score").html("<span class='disabled'> Risk Score: -->> </span> <span class='bad'>"+risk_score+"%</span>");}
        else if (35 < risk_score && risk_score < 75) {
            $("#page_domain_risk_score").html("<span class='disabled'> Risk Score: -->> </span> <span class='theme-color'>"+risk_score+"%</span>");}
        else if (risk_score < 35) {
            $("#page_domain_risk_score").html("<span class='disabled'> Risk Score: -->> </span> <span class='good'>"+risk_score+"%</span>");}

        //Show 'View More Information'
        $("#full_info").html("View More Information");

        // ------Settings Section----
        $("#cp_settings").addClass("enabled");
    }
    catch (error) {
        console.log(error);
        $("#cp_loading").css("display", "none");                                //Stop the loader
        $("#error_msg").html("Sorry. We have no data for the page you are on. This page's url scheme is not supported!");
        $("#phishing_status_img").attr("src", "./images/default-status.png");  // Failed request image
        chrome.action.setIcon({path : "./images/icon-offline.png"});           // Failed request icon
    }
};

//User's Active & current Page/Tab
chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
    // console.log(tabs[0]);
    
    currentTabUrl = tabs[0].url;                                            // Active page/tab url
    let pageTitle = tabs[0].title;                                              // ''   ''  ''     title
    var pageDomain = getHostFromUrl(currentTabUrl);                             // ''   ''  ''     Domain name

    fetch(currentTabUrl)
        .then( response => { // returns 200(if Online)
            // console.log(response.status);

            if (response.status == 200){ //If Online
                
                //Page/Tab title
                $("#page_title").css("visibility", "hidden");
                $("#page_title").html("["+pageTitle+"]");

                //Page/Tab Domain name
                $("#page_domain").css("visibility", "hidden");
                $("#page_domain").html("<span class='disabled'>Domain: -->> </span>"+pageDomain);

                getPhishingStatus(currentTabUrl);
            }
        })
        .catch( err => {    //If offline[i.e unable to fetch]
            // console.log(err);
            $("#cp_loading").css("display", "none");                            // Stop the loader
            $("#error_msg").html(`NO INTERNET CONNECTION, or the url scheme of {${pageDomain}} is not supported`);                   // No internet message
            $("#phishing_status_img").css("display", "none");                   // Hide Status image
            chrome.action.setIcon({path : "./images/icon-offline.png"});        // Offline Status icon
        });
});

/////////////////////// Launch App EXE from Extension /////////////////////////////
// --- Native app launch with fallback ---
// If user has the desktop app installed, the extension will try to open it via the custom protocol.
// If the app is not installed the code falls back to a download page.
const DESKTOP_DOWNLOAD_URL = 'https://github.com/lemoncode-xo/CatchPhish/releases/latest';

function tryLaunch(protocolUrl, fallbackUrl, timeout = 1200) {
    // Attempt to open the native app by using a hidden iframe (works in most Chromium browsers).
    // If the protocol handler is not present the iframe attempt is ignored and we fall back after timeout.
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    let handled = false;
    const start = Date.now();

    // If the page becomes hidden or the window loses focus we assume the native app took over.
    function onVisibility() {
        handled = true;
        cleanup();
    }

    function cleanup() {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('blur', onVisibility);
        try { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); } catch (e) {}
    }

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onVisibility);

    try {
        // Use the protocol URL directly; keep format compatible with existing native handler.
        iframe.src = protocolUrl;
    } catch (e) {
        // If writing to iframe fails, immediately fallback.
        cleanup();
        window.open(fallbackUrl, '_blank');
        return;
    }

    // After timeout, if not handled, go to download page.
    setTimeout(() => {
        if (!handled) {
            // Small safety: if time elapsed is very small, don't redirect immediately.
            if (Date.now() - start < timeout + 50) {
                window.open(fallbackUrl, '_blank');
            }
            cleanup();
        }
    }, timeout);
}

document.getElementById("full_info").addEventListener("click", function (e) {
    e.preventDefault();
    // Try to open app with URL parameter; keep original format for compatibility
    const protocolWithUrl = `catchphish://url=${encodeURIComponent(currentTabUrl)}`;
    tryLaunch(protocolWithUrl, DESKTOP_DOWNLOAD_URL);
});

document.getElementById("openDesktopAppLink").addEventListener("click", function (e) {
    e.preventDefault();
    const protocolPlain = "catchphish:";
    tryLaunch(protocolPlain, DESKTOP_DOWNLOAD_URL);
});
///////////////////////////////////////////////////////////////////////////////////