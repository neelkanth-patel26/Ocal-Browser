param(
    [string]$Prompt = "Ocal Browser is trying to show saved passwords. Verify your identity.",
    [string]$Caption = "Windows Security - Ocal Browser",
    [Int64]$Hwnd = 0
)

# Topmost Window Watcher Helper
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class WinTopHelper {
    private static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    private const uint SWP_NOSIZE = 0x0001;
    private const uint SWP_NOMOVE = 0x0002;
    private const uint SWP_SHOWWINDOW = 0x0040;

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    private static volatile bool _running = false;
    private static Thread _watchThread = null;

    public static void StartWatching() {
        if (_running) return;
        _running = true;
        _watchThread = new Thread(() => {
            int checks = 0;
            while (_running && checks < 300) { // Keep pinning for up to 15 seconds
                try {
                    EnumWindows((hWnd, lParam) => {
                        if (IsWindowVisible(hWnd)) {
                            StringBuilder sbClass = new StringBuilder(256);
                            GetClassName(hWnd, sbClass, 256);
                            string cls = sbClass.ToString();

                            StringBuilder sbText = new StringBuilder(256);
                            GetWindowText(hWnd, sbText, 256);
                            string txt = sbText.ToString();

                            bool isMatch = false;
                            if (cls == "Credential Dialog Xaml Host" ||
                                cls == "#32770" ||
                                txt.IndexOf("Windows Security", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                txt.IndexOf("Windows Hello", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                txt.IndexOf("Ocal Browser", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                txt.IndexOf("Making sure it's you", StringComparison.OrdinalIgnoreCase) >= 0) {
                                isMatch = true;
                            }

                            if (isMatch) {
                                SetWindowPos(hWnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
                                SetForegroundWindow(hWnd);
                                BringWindowToTop(hWnd);
                            }
                        }
                        return true;
                    }, IntPtr.Zero);
                } catch {}
                Thread.Sleep(50);
                checks++;
            }
        });
        _watchThread.IsBackground = true;
        _watchThread.Start();
    }

    public static void StopWatching() {
        _running = false;
    }
}
"@ -ErrorAction SilentlyContinue

try {
    [WinTopHelper]::StartWatching()
} catch {}

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
    } | Select-Object -First 1

    [Windows.Security.Credentials.UI.UserConsentVerifier, Windows.Security.Credentials.UI, ContentType = WindowsRuntime] | Out-Null
    
    # Check availability
    $checkOp = [Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync()
    $checkTask = $asTaskGeneric.MakeGenericMethod([Windows.Security.Credentials.UI.UserConsentVerifierAvailability]).Invoke($null, @($checkOp))
    $avail = $checkTask.GetAwaiter().GetResult()

    if ($avail -eq [Windows.Security.Credentials.UI.UserConsentVerifierAvailability]::Available) {
        $verifyOp = [Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync($Prompt)
        $verifyTask = $asTaskGeneric.MakeGenericMethod([Windows.Security.Credentials.UI.UserConsentVerificationResult]).Invoke($null, @($verifyOp))
        $result = $verifyTask.GetAwaiter().GetResult()

        try { [WinTopHelper]::StopWatching() } catch {}

        if ($result -eq [Windows.Security.Credentials.UI.UserConsentVerificationResult]::Verified) {
            Write-Output "SUCCESS"
            exit 0
        } else {
            Write-Output "CANCELLED"
            exit 1
        }
    }
} catch {
    # Fallback to legacy CredUI if WinRT is not available
}

# Fallback: CredUI local device auth
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Security.Principal;

public class FallbackAuth {
    [DllImport("credui.dll", CharSet = CharSet.Unicode)]
    public static extern int CredUIPromptForWindowsCredentials(
        ref CREDUI_INFO creditUR, int authError, ref uint authPackage,
        IntPtr inAuthBuffer, uint inAuthBufferSize,
        out IntPtr outAuthBuffer, out uint outAuthBufferSize,
        ref bool pfSave, int flags
    );

    [DllImport("ole32.dll")]
    public static extern void CoTaskMemFree(IntPtr ptr);

    [DllImport("credui.dll", CharSet = CharSet.Unicode)]
    public static extern bool CredUnPackAuthenticationBuffer(
        int flags, IntPtr inAuthBuffer, uint inAuthBufferSize,
        StringBuilder pszUserName, ref int pcchMaxUserName,
        StringBuilder pszDomainName, ref int pcchMaxDomainName,
        StringBuilder pszPassword, ref int pcchMaxPassword
    );

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDUI_INFO {
        public int cbSize;
        public IntPtr hwndParent;
        public string pszMessageText;
        public string pszCaptionText;
        public IntPtr hbmBanner;
    }

    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool LogonUser(string lpszUsername, string lpszDomain, string lpszPassword, int dwLogonType, int dwLogonProvider, out IntPtr phToken);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    public static int Prompt(string message, string caption, long hwndParent) {
        CREDUI_INFO info = new CREDUI_INFO();
        info.cbSize = Marshal.SizeOf(typeof(CREDUI_INFO));
        info.hwndParent = (hwndParent != 0) ? (IntPtr)hwndParent : IntPtr.Zero;
        info.pszMessageText = message;
        info.pszCaptionText = caption;
        info.hbmBanner = IntPtr.Zero;

        uint authPkg = 0;
        IntPtr outBuf = IntPtr.Zero;
        uint outSize = 0;
        bool save = false;

        int res = CredUIPromptForWindowsCredentials(ref info, 0, ref authPkg, IntPtr.Zero, 0, out outBuf, out outSize, ref save, 0x1 | 0x40);
        if (res != 0) return 1;

        StringBuilder u = new StringBuilder(512); int mu = 512;
        StringBuilder d = new StringBuilder(512); int md = 512;
        StringBuilder p = new StringBuilder(512); int mp = 512;
        if (!CredUnPackAuthenticationBuffer(0, outBuf, outSize, u, ref mu, d, ref md, p, ref mp)) {
            CoTaskMemFree(outBuf);
            return 1;
        }
        CoTaskMemFree(outBuf);

        string user = u.ToString();
        string dom = d.ToString();
        string pass = p.ToString();
        if (user.Contains("\\")) {
            string[] parts = user.Split('\\');
            dom = parts[0];
            user = parts[1];
        }

        IntPtr token = IntPtr.Zero;
        bool ok = LogonUser(user, string.IsNullOrEmpty(dom) ? "." : dom, pass, 2, 0, out token);
        if (token != IntPtr.Zero) CloseHandle(token);
        return ok ? 0 : 1;
    }
}
"@ -ErrorAction SilentlyContinue

try {
    [WinTopHelper]::StartWatching()
} catch {}

$res = [FallbackAuth]::Prompt($Prompt, $Caption, $Hwnd)
try { [WinTopHelper]::StopWatching() } catch {}

if ($res -eq 0) {
    Write-Output "SUCCESS"
    exit 0
} else {
    Write-Output "CANCELLED"
    exit 1
}
