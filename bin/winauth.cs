using System;
using System.Runtime.InteropServices;
using System.Text;
using System.DirectoryServices.AccountManagement;
using System.Security.Principal;

namespace Ocal.Security {
    class Program {
        [DllImport("credui.dll", CharSet = CharSet.Unicode)]
        public static extern int CredUIPromptForWindowsCredentials(
            ref CREDUI_INFO creditUR,
            int authError,
            ref uint authPackage,
            IntPtr inAuthBuffer,
            uint inAuthBufferSize,
            out IntPtr outAuthBuffer,
            out uint outAuthBufferSize,
            ref bool pfSave,
            int flags
        );

        [DllImport("ole32.dll")]
        public static extern void CoTaskMemFree(IntPtr ptr);

        [DllImport("credui.dll", CharSet = CharSet.Unicode)]
        public static extern bool CredUnPackAuthenticationBuffer(
            int flags,
            IntPtr inAuthBuffer,
            uint inAuthBufferSize,
            StringBuilder pszUserName,
            ref int pcchMaxUserName,
            StringBuilder pszDomainName,
            ref int pcchMaxDomainName,
            StringBuilder pszPassword,
            ref int pcchMaxPassword
        );

        [DllImport("credui.dll", CharSet = CharSet.Unicode)]
        public static extern bool CredPackAuthenticationBuffer(
            int flags,
            string pszUserName,
            string pszPassword,
            IntPtr pPackedCredentials,
            ref uint pcbPackedCredentials
        );

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct CREDUI_INFO {
            public int cbSize;
            public IntPtr hwndParent;
            public string pszMessageText;
            public string pszCaptionText;
            public IntPtr hbmBanner;
        }

        const int CREDUIWIN_GENERIC = 0x1;
        const int CREDUIWIN_CHECKBOX = 0x2;
        const int CREDUIWIN_AUTHPACKAGE_ONLY = 0x10;
        const int CREDUIWIN_IN_CRED_ONLY = 0x20;
        const int CREDUIWIN_ENUMERATE_CURRENT_USER = 0x40;

        [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        public static extern bool LogonUser(
            string lpszUsername,
            string lpszDomain,
            string lpszPassword,
            int dwLogonType,
            int dwLogonProvider,
            out IntPtr phToken
        );

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool CloseHandle(IntPtr hObject);

        const int LOGON32_LOGON_INTERACTIVE = 2;
        const int LOGON32_PROVIDER_DEFAULT = 0;

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
        private static System.Threading.Thread _watchThread = null;

        public static void StartWatching() {
            if (_running) return;
            _running = true;
            _watchThread = new System.Threading.Thread(() => {
                int checks = 0;
                while (_running && checks < 300) {
                    try {
                        EnumWindows((hWnd, lParam) => {
                            if (IsWindowVisible(hWnd)) {
                                StringBuilder sbClass = new StringBuilder(256);
                                GetClassName(hWnd, sbClass, 256);
                                string cls = sbClass.ToString();

                                StringBuilder sbText = new StringBuilder(256);
                                GetWindowText(hWnd, sbText, 256);
                                string txt = sbText.ToString();

                                bool isMatch = (cls == "Credential Dialog Xaml Host" ||
                                                cls == "#32770" ||
                                                txt.IndexOf("Windows Security", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                                txt.IndexOf("Windows Hello", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                                txt.IndexOf("Ocal Browser", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                                txt.IndexOf("Making sure it's you", StringComparison.OrdinalIgnoreCase) >= 0);

                                if (isMatch) {
                                    SetWindowPos(hWnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
                                    SetForegroundWindow(hWnd);
                                    BringWindowToTop(hWnd);
                                }
                            }
                            return true;
                        }, IntPtr.Zero);
                    } catch {}
                    System.Threading.Thread.Sleep(50);
                    checks++;
                }
            });
            _watchThread.IsBackground = true;
            _watchThread.Start();
        }

        public static void StopWatching() {
            _running = false;
        }

        static int Main(string[] args) {
            try {
                string prompt = args.Length > 0 ? args[0] : "Ocal Browser is trying to show passwords. Type your Windows password to allow this.";
                string caption = args.Length > 1 ? args[1] : "Windows Security - Ocal Browser";
                long parentHwndVal = 0;
                if (args.Length > 2) {
                    long.TryParse(args[2], out parentHwndVal);
                }

                string currentUser = Environment.UserName;
                string currentDomain = Environment.UserDomainName;

                CREDUI_INFO credUiInfo = new CREDUI_INFO();
                credUiInfo.cbSize = Marshal.SizeOf(typeof(CREDUI_INFO));
                credUiInfo.hwndParent = (parentHwndVal != 0) ? (IntPtr)parentHwndVal : IntPtr.Zero;
                credUiInfo.pszMessageText = prompt;
                credUiInfo.pszCaptionText = caption;
                credUiInfo.hbmBanner = IntPtr.Zero;

                uint authPackage = 0;
                IntPtr outAuthBuffer = IntPtr.Zero;
                uint outAuthBufferSize = 0;
                bool save = false;

                // Pre-pack current username into inAuthBuffer
                IntPtr inAuthBuffer = IntPtr.Zero;
                uint inAuthBufferSize = 0;
                CredPackAuthenticationBuffer(0, currentUser, "", IntPtr.Zero, ref inAuthBufferSize);
                if (inAuthBufferSize > 0) {
                    inAuthBuffer = Marshal.AllocHGlobal((int)inAuthBufferSize);
                    CredPackAuthenticationBuffer(0, currentUser, "", inAuthBuffer, ref inAuthBufferSize);
                }

                int flags = CREDUIWIN_GENERIC | CREDUIWIN_ENUMERATE_CURRENT_USER;
                int authError = 0;

                StartWatching();

                while (true) {
                    int result = CredUIPromptForWindowsCredentials(
                        ref credUiInfo,
                        authError,
                        ref authPackage,
                        inAuthBuffer,
                        inAuthBufferSize,
                        out outAuthBuffer,
                        out outAuthBufferSize,
                        ref save,
                        flags
                    );

                    if (result != 0) {
                        // User cancelled or closed dialog (ERROR_CANCELLED = 1223)
                        if (inAuthBuffer != IntPtr.Zero) Marshal.FreeHGlobal(inAuthBuffer);
                        Console.WriteLine("CANCELLED");
                        return 1;
                    }

                    // Unpack credentials
                    StringBuilder user = new StringBuilder(512);
                    int maxUser = user.Capacity;
                    StringBuilder domain = new StringBuilder(512);
                    int maxDomain = domain.Capacity;
                    StringBuilder pass = new StringBuilder(512);
                    int maxPass = pass.Capacity;

                    bool unpacked = CredUnPackAuthenticationBuffer(
                        0,
                        outAuthBuffer,
                        outAuthBufferSize,
                        user,
                        ref maxUser,
                        domain,
                        ref maxDomain,
                        pass,
                        ref maxPass
                    );

                    CoTaskMemFree(outAuthBuffer);

                    if (!unpacked) {
                        authError = 1326; // ERROR_LOGON_FAILURE
                        continue;
                    }

                    string enteredUser = user.ToString();
                    string enteredDomain = domain.ToString();
                    string enteredPassword = pass.ToString();

                    // Strip domain prefix if included in username
                    if (enteredUser.Contains("\\")) {
                        string[] parts = enteredUser.Split('\\');
                        enteredDomain = parts[0];
                        enteredUser = parts[1];
                    }

                    // Validate credentials
                    bool isValid = false;

                    // Try PrincipalContext (handles Local & Microsoft Accounts & Domain)
                    try {
                        ContextType ctxType = (enteredDomain == Environment.MachineName || string.IsNullOrEmpty(enteredDomain)) 
                            ? ContextType.Machine 
                            : ContextType.Domain;
                        
                        using (PrincipalContext pc = new PrincipalContext(ctxType)) {
                            isValid = pc.ValidateCredentials(enteredUser, enteredPassword);
                        }
                    } catch {
                        // Fallback to LogonUser
                        IntPtr token = IntPtr.Zero;
                        isValid = LogonUser(
                            enteredUser,
                            string.IsNullOrEmpty(enteredDomain) ? "." : enteredDomain,
                            enteredPassword,
                            LOGON32_LOGON_INTERACTIVE,
                            LOGON32_PROVIDER_DEFAULT,
                            out token
                        );
                        if (token != IntPtr.Zero) CloseHandle(token);
                    }

                    if (isValid) {
                        if (inAuthBuffer != IntPtr.Zero) Marshal.FreeHGlobal(inAuthBuffer);
                        Console.WriteLine("SUCCESS");
                        return 0;
                    } else {
                        // Wrong password - show error on next loop
                        authError = 1326; // ERROR_LOGON_FAILURE
                    }
                }
            } catch (Exception ex) {
                Console.Error.WriteLine("ERROR: " + ex.Message);
                return 2;
            }
        }
    }
}
