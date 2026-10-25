using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class SnapTileHelper {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenWindowStation(string lpszWinSta, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetProcessWindowStation(IntPtr hWinSta);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsZoomed(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("dwmapi.dll")]
    public static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out bool pvAttribute, int cbAttribute);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    const int GWL_STYLE = -16;
    const int GWL_EXSTYLE = -20;
    const uint WS_CHILD = 0x40000000;
    const uint WS_EX_TOOLWINDOW = 0x00000080;
    const int DWMWA_CLOAKED = 14;
    const int SW_RESTORE = 9;
    const int SW_SHOWNORMAL = 1;
    const uint SWP_NOACTIVATE = 0x0010;
    const uint SWP_NOZORDER = 0x0004;
    const uint SWP_SHOWWINDOW = 0x0040;
    const uint SWP_FRAMECHANGED = 0x0020;
    const uint GENERIC_ALL = 0x10000000;

    static void EnsureInteractiveDesktop() {
        try {
            IntPtr hWinsta = OpenWindowStation("WinSta0", false, GENERIC_ALL);
            if (hWinsta != IntPtr.Zero) {
                SetProcessWindowStation(hWinsta);
            }
            IntPtr hDesk = OpenDesktop("Default", 0, false, GENERIC_ALL);
            if (hDesk != IntPtr.Zero) {
                SetThreadDesktop(hDesk);
            }
        } catch {}
    }

    static bool IsCandidateAppWindow(IntPtr hWnd, IntPtr excludeHwnd) {
        if (hWnd == excludeHwnd) return false;
        if (!IsWindowVisible(hWnd)) return false;
        if (IsIconic(hWnd)) return false;

        int style = GetWindowLong(hWnd, GWL_STYLE);
        if ((style & WS_CHILD) != 0) return false;

        int exStyle = GetWindowLong(hWnd, GWL_EXSTYLE);
        if ((exStyle & WS_EX_TOOLWINDOW) != 0) return false;

        bool isCloaked = false;
        try {
            DwmGetWindowAttribute(hWnd, DWMWA_CLOAKED, out isCloaked, Marshal.SizeOf(typeof(bool)));
            if (isCloaked) return false;
        } catch {}

        var sbTitle = new StringBuilder(256);
        GetWindowText(hWnd, sbTitle, 256);
        string title = sbTitle.ToString().Trim();
        if (string.IsNullOrEmpty(title)) return false;

        var sbClass = new StringBuilder(256);
        GetClassName(hWnd, sbClass, 256);
        string className = sbClass.ToString();

        if (className == "Shell_TrayWnd" || className == "Progman" || className == "WorkerW" ||
            className == "Windows.UI.Core.CoreWindow" || className == "Shell_SecondaryTrayWnd" ||
            className.Contains("Flyout") || className.Contains("Taskbar") || className.Contains("Overflow") ||
            className.Contains("SnapFlyout") || className.Contains("Ocal") ||
            title == "Program Manager" || title == "Snap Layouts" || title == "Settings" ||
            title == "Windows Shell Experience Host") {
            return false;
        }

        RECT rect;
        if (GetWindowRect(hWnd, out rect)) {
            int w = rect.Right - rect.Left;
            int h = rect.Bottom - rect.Top;
            if (w < 160 || h < 160) return false;
        }

        return true;
    }

    public static List<IntPtr> GetTopOtherAppWindows(IntPtr excludeHwnd, int maxCount) {
        EnsureInteractiveDesktop();
        var result = new List<IntPtr>();

        EnumDesktopWindows(IntPtr.Zero, (hWnd, lParam) => {
            if (IsCandidateAppWindow(hWnd, excludeHwnd)) {
                result.Add(hWnd);
                if (result.Count >= maxCount) return false;
            }
            return true;
        }, IntPtr.Zero);

        return result;
    }

    public static void TileWindow(IntPtr hWnd, int x, int y, int w, int h) {
        if (hWnd == IntPtr.Zero) return;

        // If maximized, restore so SetWindowPos moves it properly
        if (IsZoomed(hWnd)) {
            ShowWindow(hWnd, SW_RESTORE);
        } else {
            ShowWindow(hWnd, SW_SHOWNORMAL);
        }

        SetWindowPos(hWnd, IntPtr.Zero, x, y, w, h,
            SWP_NOACTIVATE | SWP_NOZORDER | SWP_SHOWWINDOW | SWP_FRAMECHANGED);
    }

    public static int Main(string[] args) {
        try {
            if (args.Length < 5) {
                Console.WriteLine("Usage: SnapTileHelper <excludeHwnd> <x1> <y1> <w1> <h1> [x2 y2 w2 h2]");
                return 1;
            }

            long rawExclude = 0;
            long.TryParse(args[0], out rawExclude);
            IntPtr excludeHwnd = new IntPtr(rawExclude);

            int x1 = int.Parse(args[1]);
            int y1 = int.Parse(args[2]);
            int w1 = int.Parse(args[3]);
            int h1 = int.Parse(args[4]);

            bool hasSecondTarget = (args.Length >= 9);
            int x2 = 0, y2 = 0, w2 = 0, h2 = 0;
            if (hasSecondTarget) {
                x2 = int.Parse(args[5]);
                y2 = int.Parse(args[6]);
                w2 = int.Parse(args[7]);
                h2 = int.Parse(args[8]);
            }

            var apps = GetTopOtherAppWindows(excludeHwnd, hasSecondTarget ? 2 : 1);
            if (apps.Count == 0) {
                Console.WriteLine("No candidate other application window found.");
                return 0;
            }

            if (hasSecondTarget && apps.Count == 1) {
                // If only one companion app exists but two zones were specified (e.g. 3-column split),
                // expand the companion app to comfortably fill both remaining zones!
                int combinedX = Math.Min(x1, x2);
                int combinedY = Math.Min(y1, y2);
                int combinedW = (Math.Max(x1 + w1, x2 + w2)) - combinedX;
                int combinedH = (Math.Max(y1 + h1, y2 + h2)) - combinedY;

                TileWindow(apps[0], combinedX, combinedY, combinedW, combinedH);
                var sb = new StringBuilder(256);
                GetWindowText(apps[0], sb, 256);
                Console.WriteLine("Tiled companion app across dual zones: " + sb.ToString() + " to " + combinedX + "," + combinedY + " " + combinedW + "x" + combinedH);
            } else {
                // Tile first other app
                TileWindow(apps[0], x1, y1, w1, h1);
                var sb1 = new StringBuilder(256);
                GetWindowText(apps[0], sb1, 256);
                Console.WriteLine("Tiled other app 1: " + sb1.ToString() + " to " + x1 + "," + y1 + " " + w1 + "x" + h1);

                // Tile second other app if requested and available
                if (hasSecondTarget && apps.Count > 1) {
                    TileWindow(apps[1], x2, y2, w2, h2);
                    var sb2 = new StringBuilder(256);
                    GetWindowText(apps[1], sb2, 256);
                    Console.WriteLine("Tiled other app 2: " + sb2.ToString() + " to " + x2 + "," + y2 + " " + w2 + "x" + h2);
                }
            }

            // Keep focus on Ocal Browser
            if (excludeHwnd != IntPtr.Zero) {
                SetForegroundWindow(excludeHwnd);
            }

            return 0;
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex.Message);
            return 2;
        }
    }
}
