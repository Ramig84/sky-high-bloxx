package app.lovable.skyhighbloxx;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

/** Local, immutable game content with same-origin online accounts and ad services. */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        final JSONObject files;
        try (InputStream stream = getAssets().open("public/native-files.json")) {
            // InputStream.readAllBytes requires newer Android than our minimum.
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int count;
            while ((count = stream.read(buffer)) != -1) {
                bytes.write(buffer, 0, count);
            }
            files = new JSONObject(new String(bytes.toByteArray(), StandardCharsets.UTF_8));
        } catch (Exception error) {
            throw new IllegalStateException("Packaged game manifest is missing", error);
        }
        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                // Never intercept API/auth/ad traffic or another origin.
                if ("GET".equals(request.getMethod()) && "sky-high-bloxx.lovable.app".equals(request.getUrl().getHost())) {
                    String path = request.getUrl().getPath();
                    JSONObject entry = files.optJSONObject(path == null ? "/" : path);
                    if (entry != null) {
                        try {
                            return new WebResourceResponse(entry.getString("mime"), "UTF-8", 200, "OK",
                                Collections.singletonMap("Cache-Control", "no-cache"),
                                getAssets().open("public/" + entry.getString("file")));
                        } catch (Exception error) {
                            // Fail visibly rather than silently mixing packaged and remote revisions.
                            return new WebResourceResponse("text/plain", "UTF-8", 500, "Missing packaged asset",
                                Collections.emptyMap(), new ByteArrayInputStream("Missing game asset".getBytes(StandardCharsets.UTF_8)));
                        }
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }
        });
        // Reload after installing the client so even the initial document is local.
        getBridge().getWebView().stopLoading();
        getBridge().getWebView().loadUrl("https://sky-high-bloxx.lovable.app/");
        // Keep the game's renderer important while a full-screen ad covers it.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getBridge().getWebView().setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
        }
    }
}