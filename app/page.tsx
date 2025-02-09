'use client';

import { supabase } from "@/app/initSupabase";
import { Loader, Star } from "lucide-react";
import { Tables } from '@/database.types'
import { useEffect, useState } from "react";
import { on } from "events";


const moscowTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Moscow",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
});


function TimetableListElement(
  lesson: Tables<'lessons'>,
  isFavDiscipline: boolean,
  handleFav: (disciplineOid: number, isNowFav: boolean) => void
) {
  const discipline = lesson.discipline?.replace('(рус)', '').replace('(анг)', '').trim()

  const begin = moscowTime.format(new Date(lesson.begin!));
  const end = moscowTime.format(new Date(lesson.end!));

  const starStroke = isFavDiscipline ? "#a73afd" : "#242424";
  const starFill = isFavDiscipline ? "#a73afd" : "#ffffff00";
  const kindOfWork = lesson.kind_of_work?.replace('Научно-исследовательский семинар', 'НИС')

  return (
    <div className="lesson" key={lesson.lesson_oid}>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <p>{kindOfWork}</p>
        <p style={{ alignSelf: 'end' }}>{begin}&nbsp;-&nbsp;{end}</p>
      </div>
      <div style={{ gap: "0.25em", fontWeight: 'bold', marginTop: '8px', marginBottom: '8px', display: "inline-flex" }}>
        {discipline}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <p>{lesson.auditorium}, {lesson.building} ({lesson.auditorium_amount})</p>
        <Star style={{ display: "inline", width: "1em", height: "1em", cursor: "pointer" }} fill={starFill} color={starStroke} onClick={() => handleFav(lesson.discipline_oid!, !isFavDiscipline)} />
      </div>
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


function TimetableList(
  timetable: Tables<'lessons'>[],
  favDisciplineOids: Set<number>,
  handleFav: (discipline_oid: number, isNowFav: boolean) => void
) {
  const rows = [];
  let lastDate = '';
  for (const lesson of timetable) {
    const lessonDate = moscowDate.format(new Date(lesson.begin!));
    if (!(lastDate === lessonDate)) {
      rows.push(DateDivider(lessonDate));
      lastDate = lessonDate;
    }

    const isFav = favDisciplineOids.has(lesson.discipline_oid!);
    rows.push(TimetableListElement(lesson, isFav, handleFav));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows}
    </div>
  );
}


async function fetchTimetable(
  filterEndFrom: Date,
  filterEndTo: Date,
  filterBuildingLike: string
) {
  let resp = supabase
    .from('lessons')
    .select('*')
    .like('building', filterBuildingLike)
    .gte('end', filterEndFrom.toISOString())
    .lt('end', filterEndTo.toISOString())
    .order('begin')
    .order('auditorium_amount', { ascending: false });

  return await resp;
}

function Filters() {
  return 
}


function Main() {
  let [timetable, setTimetable] = useState<Tables<'lessons'>[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fav, setFav] = useState<Set<number>>(new Set()); // TODO: local storage

  const now = new Date();
  const endOfTomorrow = new Date(now.getTime());
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
  endOfTomorrow.setHours(23, 59, 59, 999);
  const [filterEndFrom, setFilterEndFrom] = useState<Date>(now);
  const [filterEndTo, setFilterEndTo] = useState<Date>(endOfTomorrow);
  const [filterBuildingLike, setFilterBuidingLike] = useState<string>('%Покровский%');
  const [filterHideOnline, setFilterHideOnline] = useState<boolean>(true);
  const [filterOnlyFav, setFilterOnlyFav] = useState<boolean>(false);

  useEffect(() => {
    const _fetchTimetable = async () => {
      const { data, error } = await fetchTimetable(filterEndFrom, filterEndTo, filterBuildingLike);
      if (error)
        console.log('error', error);
      else {
        setLoading(false);
        setTimetable(data!);
      }
    };

    _fetchTimetable();
    console.log('fetched');
  }, [filterEndFrom, filterEndTo, filterBuildingLike, filterHideOnline]);


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

  if (filterOnlyFav) {
    timetable = timetable.filter((lesson) => fav.has(lesson.discipline_oid!));
  }

  if (filterHideOnline) {
    timetable = timetable.filter((lesson) => (-1 === lesson.auditorium?.search("Online")));
  }

  // if (timetable!.length == 0) {
  //   return <div>Timetable is empty</div>;
  // } 

  const handleFav = (discipline_oid: number, newIsFav: boolean) => {
    const newFav = new Set(fav);
    if (newIsFav) {
      newFav.add(discipline_oid);
    } else {
      newFav.delete(discipline_oid);
    }
    setFav(newFav);
  }

  let onlineFilter = (
    <button onClick={() => { setFilterHideOnline(!filterHideOnline); }} className={"filter filter-" + (filterHideOnline ? "active" : "inactive")}>
      OFFLINE
    </button>
  )

  let onlyFavFilter  = (
    <button onClick={() => { setFilterOnlyFav(!filterOnlyFav); }} className={"filter filter-" + (filterOnlyFav ? "active" : "inactive")}>
      <Star style={{ width: "1em", height: "1em" }}/> Отмеченное
    </button>
  )

  let filters = [onlineFilter, onlyFavFilter];
  return <>
    <div className="filters">
      {...filters}
    </div>
    {TimetableList(timetable, fav, handleFav)}
  </>
}

export default Main;