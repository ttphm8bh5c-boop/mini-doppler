"""
Python 單元測試套件：產科多普勒計算器雙語言交叉驗證
驗證所有臨床數學運算、極值邊界條件與 ISUOG 繁體中文判讀語句。
"""

import unittest
import math


def gestational_age_to_decimal(weeks: float, days: float = 0.0) -> float:
    return float(weeks) + (float(days) / 7.0)


def gestational_age_to_days(weeks: int, days: int = 0) -> int:
    return (int(weeks) * 7) + int(days)


def calculate_cpr(mca_pi: float, ua_pi: float) -> float:
    if mca_pi <= 0:
        raise ValueError("大腦中動脈 PI 必須大於零")
    if ua_pi <= 0:
        raise ZeroDivisionError("臍動脈 PI 必須大於零（不允許除以零）")
    return float(mca_pi) / float(ua_pi)


def format_cpr_for_display(cpr: float) -> str:
    return f"{cpr:.2f}"


def normal_cdf(z: float) -> float:
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def z_score_to_percentile(z: float) -> float:
    return normal_cdf(z) * 100.0


def calculate_z_score(observed: float, expected_median: float, sd: float, is_log10: bool = False) -> float:
    if sd <= 0:
        raise ValueError("標準差必須為正數")
    if is_log10:
        if observed <= 0 or expected_median <= 0:
            raise ValueError("對數尺度數值必須大於零")
        return (math.log10(observed) - math.log10(expected_median)) / sd
    return (observed - expected_median) / sd


def fmf2019_ua_reference(ga_decimal_weeks: float):
    ga_days = ga_decimal_weeks * 7.0
    median = 1.6473 - (0.003005 * ga_days)
    sd = 0.08713 - (0.0002936 * ga_days) + (0.0000009355 * ga_days * ga_days)

    z90 = 1.644853
    log_median = math.log10(median)
    centile5 = 10.0 ** (log_median - (z90 * sd))
    centile50 = median
    centile95 = 10.0 ** (log_median + (z90 * sd))

    def get_percentile(measured: float) -> float:
        z = (math.log10(measured) - log_median) / sd
        return z_score_to_percentile(z)

    return {
        "median": median,
        "sd": sd,
        "centile5": centile5,
        "centile50": centile50,
        "centile95": centile95,
        "get_percentile": get_percentile
    }


def interpret_cpr(percentile: float) -> str:
    if percentile < 5.0:
        return "異常低 CPR（<5th centile），符合腦血流重新分佈／腦保護模式（cerebral blood-flow redistribution / brain-sparing pattern）。"
    return "CPR 在該懷孕週數參考範圍內（CPR within gestational-age reference range）。"


def interpret_mca(percentile: float) -> str:
    if percentile < 5.0:
        return "低 MCA PI，符合腦血管擴張（Low MCA PI, consistent with cerebral vasodilatation）。"
    return "MCA PI 在該懷孕週數參考範圍內。"


def interpret_ua(percentile: float) -> str:
    if percentile > 95.0:
        return "臍動脈 PI 升高，提示胎盤血管阻力增加（Elevated umbilical artery PI, suggesting increased placental vascular resistance）。"
    return "臍動脈 PI 在該懷孕週數參考範圍內。"


def interpret_combined(cpr_p: float, mca_p: float, ua_p: float) -> str:
    is_cpr_low = cpr_p < 5.0
    is_mca_low = mca_p < 5.0
    is_ua_high = ua_p > 95.0

    if is_cpr_low and is_mca_low and is_ua_high:
        return "異常 CPR 合併低 MCA PI 與臍動脈 PI 升高，符合顯著腦血流重新分佈／腦保護效應與高胎盤阻力。"
    elif is_cpr_low and is_mca_low and not is_ua_high:
        return "異常 CPR 合併低 MCA PI，符合腦血流重新分佈／腦保護效應。"
    elif is_cpr_low and is_ua_high:
        return "異常 CPR 合併胎盤阻力增加。"
    elif is_cpr_low:
        return "異常低 CPR（< 第 5 百分位數），符合腦血流重新分佈／腦保護模式。"
    elif is_mca_low and not is_cpr_low:
        return "檢測到 MCA PI 偏低。CPR 仍維持在參考範圍內。"
    elif is_ua_high and not is_cpr_low:
        return "檢測到臍動脈 PI 升高。CPR 仍維持在參考範圍內。"
    else:
        return "該懷孕週數的多普勒血流關係正常。"


class TestObstetricDoppler(unittest.TestCase):
    def test_gestational_age_conversion(self):
        self.assertAlmostEqual(gestational_age_to_decimal(35, 4), 35 + 4/7, places=5)
        self.assertEqual(gestational_age_to_days(35, 4), 249)
        self.assertEqual(gestational_age_to_days(20, 0), 140)
        self.assertEqual(gestational_age_to_days(41, 6), 293)

    def test_cpr_calculation(self):
        cpr = calculate_cpr(1.28, 1.02)
        self.assertAlmostEqual(cpr, 1.28 / 1.02, places=6)
        self.assertEqual(format_cpr_for_display(cpr), "1.25")

        with self.assertRaises(ZeroDivisionError):
            calculate_cpr(1.28, 0)
        with self.assertRaises(ZeroDivisionError):
            calculate_cpr(1.28, -0.5)
        with self.assertRaises(ValueError):
            calculate_cpr(-1.28, 1.02)
        with self.assertRaises(ValueError):
            calculate_cpr(0, 1.02)

    def test_normal_cdf(self):
        self.assertAlmostEqual(normal_cdf(0.0), 0.5, places=5)
        self.assertAlmostEqual(normal_cdf(-1.644853), 0.05, places=3)
        self.assertAlmostEqual(normal_cdf(1.644853), 0.95, places=3)
        self.assertAlmostEqual(z_score_to_percentile(0.0), 50.0, places=3)
        self.assertAlmostEqual(z_score_to_percentile(-1.644853), 5.0, places=2)
        self.assertAlmostEqual(z_score_to_percentile(1.644853), 95.0, places=2)

    def test_fmf2019_ua_reference(self):
        ref20 = fmf2019_ua_reference(20.0)
        self.assertAlmostEqual(ref20["median"], 1.2266, places=3)

        ref35_4 = fmf2019_ua_reference(35 + 4/7)
        self.assertAlmostEqual(ref35_4["median"], 0.899, places=3)
        self.assertTrue(ref35_4["centile5"] < ref35_4["centile50"] < ref35_4["centile95"])

        self.assertAlmostEqual(ref35_4["get_percentile"](ref35_4["median"]), 50.0, places=2)

    def test_threshold_boundaries(self):
        self.assertIn("異常低 CPR", interpret_cpr(4.99))
        self.assertIn("參考範圍內", interpret_cpr(5.00))

        self.assertIn("低 MCA PI", interpret_mca(4.99))
        self.assertIn("參考範圍內", interpret_mca(5.00))

        self.assertIn("參考範圍內", interpret_ua(95.00))
        self.assertIn("臍動脈 PI 升高", interpret_ua(95.01))

    def test_combined_interpretations(self):
        self.assertEqual(
            interpret_combined(50.0, 50.0, 50.0),
            "該懷孕週數的多普勒血流關係正常。"
        )
        self.assertEqual(
            interpret_combined(3.0, 4.0, 50.0),
            "異常 CPR 合併低 MCA PI，符合腦血流重新分佈／腦保護效應。"
        )
        self.assertEqual(
            interpret_combined(2.5, 20.0, 98.0),
            "異常 CPR 合併胎盤阻力增加。"
        )
        self.assertEqual(
            interpret_combined(12.0, 4.5, 20.0),
            "檢測到 MCA PI 偏低。CPR 仍維持在參考範圍內。"
        )
        self.assertEqual(
            interpret_combined(1.0, 2.0, 99.0),
            "異常 CPR 合併低 MCA PI 與臍動脈 PI 升高，符合顯著腦血流重新分佈／腦保護效應與高胎盤阻力。"
        )
        self.assertEqual(
            interpret_combined(20.0, 30.0, 97.0),
            "檢測到臍動脈 PI 升高。CPR 仍維持在參考範圍內。"
        )


if __name__ == "__main__":
    unittest.main()
