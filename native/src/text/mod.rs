mod diacritics;

pub use self::diacritics::diacritics;
use std::collections::HashMap;
use regex::Regex;

///
/// Detect Strings like `5 Avenue` and return a synonym like `5th Avenue` where possible
///
pub fn number_suffix(text: String) -> Option<String> {
    lazy_static! {
        static ref NUMSUFFIX: Regex = Regex::new(r"(?i)^(?P<number>\d+)\s+(?P<name>\w.*)$").unwrap();
    }

    match NUMSUFFIX.captures(text.as_str()) {
        Some(capture) => {
            let num: i64 = match capture["number"].parse() {
                Ok(num) => num,
                _ => { return None; }
            };

            let suffix: String;
            if (num % 100) >= 10 && (num % 100) <= 20 {
                suffix = String::from("th");
            } else if (num % 10) == 1 {
                suffix = String::from("st");
            } else if (num % 10) == 2 {
                suffix = String::from("nd");
            } else if (num % 10) == 3 {
                suffix = String::from("rd");
            } else {
                suffix = String::from("th");
            }

            Some(format!("{}{} {}", num, suffix, &capture["name"]))
        },
        None => None
    }
}

pub fn written_numeric(text: String) -> Option<String> {
    lazy_static! {
        static ref NUMERIC: Regex = Regex::new(r"(?i)(?P<pre>^.*)\s(?P<tenth>Twenty|Thirty|Fourty|Fifty|Sixty|Seventy|Eighty|Ninety)-(?P<nth>First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth)\s(?P<post>.*$)").unwrap();

        static ref NUMERIC_MAP: HashMap<String, String> = {
            let mut m = HashMap::new();

            m.insert(String::from("twenty"), String::from("2"));
            m.insert(String::from("thirty"), String::from("3"));
            m.insert(String::from("fourty"), String::from("4"));
            m.insert(String::from("fifty"), String::from("5"));
            m.insert(String::from("sixty"), String::from("6"));
            m.insert(String::from("seventy"), String::from("7"));
            m.insert(String::from("eighty"), String::from("8"));
            m.insert(String::from("ninety"), String::from("9"));

            m.insert(String::from("first"), String::from("1st"));
            m.insert(String::from("second"), String::from("2nd"));
            m.insert(String::from("third"), String::from("3rd"));
            m.insert(String::from("fourth"), String::from("4th"));
            m.insert(String::from("fifth"), String::from("5th"));
            m.insert(String::from("sixth"), String::from("6th"));
            m.insert(String::from("seventh"), String::from("7th"));
            m.insert(String::from("eighth"), String::from("8th"));
            m.insert(String::from("ninth"), String::from("9th"));

            m
        };
    }

    match NUMERIC.captures(text.as_str()) {
        Some(capture) => {
            let tenth = NUMERIC_MAP.get(&capture["tenth"])?;
            let nth = NUMERIC_MAP.get(&capture["nth"])?;

            Some(String::from(format!("{} {}{} {}", &capture["pre"], tenth, nth, &capture["post"])))
        },
        _ => None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_number_suffix() {
        assert_eq!(
            number_suffix(String::from("1st Avenue")),
            None
        );

        assert_eq!(
            number_suffix(String::from("1 Avenue")),
            Some(String::from("1st Avenue"))
        );

        assert_eq!(
            number_suffix(String::from("2 Avenue")),
            Some(String::from("2nd Avenue"))
        );

        assert_eq!(
            number_suffix(String::from("3 Street")),
            Some(String::from("3rd Street"))
        );

        assert_eq!(
            number_suffix(String::from("4 Street")),
            Some(String::from("4th Street"))
        );

        assert_eq!(
            number_suffix(String::from("20 Street")),
            Some(String::from("20th Street"))
        );

        assert_eq!(
            number_suffix(String::from("21 Street")),
            Some(String::from("21st Street"))
        );
    }

    #[test]
    fn test_written_numeric() {
        assert_eq!(
            written_numeric(String::from("Twenty-third Avenue NW")),
            Some(String::from(""))
        );

        assert_eq!(
            written_numeric(String::from("North twenty-Third Avenue")),
            Some(String::from(""))
        );

        assert_eq!(
            written_numeric(String::from("TWENTY-THIRD Avenue")),
            Some(String::from(""))
        );
    }
}
