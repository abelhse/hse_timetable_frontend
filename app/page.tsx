'use client';

import { supabase } from "@/app/initSupabase";
import { Loader, Star } from "lucide-react";
import { Tables } from '@/database.types'


const moscowTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Moscow",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
});


function TimetableListElement(
  lesson: Tables<'lessons'>, 
  isFav: boolean,
  handleFav: (discipline_id: number, isNowFav: boolean) => void
)
{
  const discipline = lesson.discipline?.replace('(рус)', '').replace('(анг)', '').trim()

  const begin = moscowTime.format(new Date(lesson.begin));
  const end = moscowTime.format(new Date(lesson.end));

  const starColor = isFav ? "#ffde21" : "#000000";

  return (
    <div className="lesson" key={lesson.lesson_oid}>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <p>{lesson.kind_of_work}</p>
        <p style={{ alignSelf: 'end' }}>{begin}&nbsp;-&nbsp;{end}</p>
      </div>
      <div style={{ gap: "0.25em", fontWeight: 'bold', marginTop: '8px', marginBottom: '8px', display: "inline-flex"}}>
      {discipline}
      <Star style={{display: "inline", width: "1em", height: "1em"}} color={starColor} onClick={() => handleFav(lesson.discipline_oid, !isFav)}/>
      </div>
      <p>{lesson.auditorium}, {lesson.building} ({lesson.auditorium_amount})</p>
    </div>
  );
}


const moscowDate = new Intl.DateTimeFormat("ru", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour12: false,
  weekday: 'long'
});


function DateDivider(lessonDate: string) {
  return (
    <div className="date-divider" key={lessonDate}>{lessonDate}</div>
  )
}


function TimetableList(timetable, fav: Set<string>, handleFav) {
  const rows = [];
  let lastDate = '';
  for (const lesson of timetable) {
    const lessonDate = moscowDate.format(new Date(lesson.begin));
    if (!(lastDate === lessonDate)) {
      rows.push(DateDivider(lessonDate));
      lastDate = lessonDate;
    }

    const isFav = fav.has(lesson.discipline_oid);
    rows.push(TimetableListElement(lesson, isFav, handleFav));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows}
    </div>
  );
}


async function fetchTimetable() {
  const now = new Date();
  const endOfToday = new Date(now.getTime());
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now.getTime());
  startOfToday.setHours(0, 0, 0, 0);

  console.log(now.toISOString());
  console.log(endOfToday.toISOString());

  return await supabase
    .from('lessons')
    .select('*')
    .like('building', '%Покровский%')
    .not('auditorium', 'like', '%Online%')
    .order('begin')
    .order('auditorium_amount', { ascending: false })
    .gte('end', startOfToday.toISOString())
    .lt('end', endOfToday.toISOString())
}


function Main() {
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fav, setFav] = useState<Set<number>>(new Set()); // TODO: local storage
  useEffect(() => {
    const _fetchTimetable = async () => {
      const { data, error } = await fetchTimetable();
      if (error)
        console.log('error', error);
      else {
        setLoading(false);
        setTimetable(data);
      }
    }
    _fetchTimetable();
    console.log('fetched');
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Loader style={{ animation: 'spinner 0.8s linear infinite' }}></Loader>
      </div>
    );
  }

  if (timetable === null) {
    return <div>Error (timetable is null)</div>;
  }

  if (timetable.length == 0) {
    return <div>Timetable is empty</div>;
  }

  const handleFav = (discipline_oid: number, newIsFav: boolean) => {
    if (newIsFav) {
      setFav(new Set([...fav, discipline_oid]));
    } else {
      const newFav = new Set(fav);
      newFav.delete(discipline_oid);
      setFav(newFav);
    }
  }

  return TimetableList(timetable, fav, handleFav);
}

export default Main;