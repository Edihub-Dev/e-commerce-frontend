import { useDispatch, useSelector } from "react-redux";
import { useMemo } from "react";

export const useAppDispatch = () => useDispatch();

export const useAppSelector = (selector) => {
  const selected = useSelector(selector);
  return useMemo(() => selected, [selected]);
};
