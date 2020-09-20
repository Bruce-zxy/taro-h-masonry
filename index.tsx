import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView, Image } from '@tarojs/components';

import { stateHandler } from '@/utils';
import { DebounceQueue } from '@/utils/queue';
import Loading from '@/components/Loading';

import './index.less';

const debounceQueue = new DebounceQueue();
const loadCountQueue = new DebounceQueue();

export default ({
  init = async (): Promise<any[]> => [{}],
  onLoadMore = async (pageIndex): Promise<any[]> => [],
  onScroll = e => { },
  onReachTop = e => { },
  emptyImage,
  renderHeader = () => <></>,
  render = (target, i) => <></>,
  onImageClick = target => () => { },
  source = ''
}) => {
  const [loadFlag, setLoadFlag] = useState(0);
  const [loadCount, setLoadCount] = useState(0);
  const [state, setState] = useState({
    initLoading: true,
    moreLoading: false,
    refreshLoading: false,
    list1: [],
    list1Height: 0,
    list2: [],
    list2Height: 0,
    index: 1,
    hasMore: true,
    slidingDistance: 0,
    refreshText: '继续下拉即可刷新',
  });

  const {
    initLoading,
    moreLoading,
    refreshLoading,
    list1,
    list2,
    index,
    hasMore,
    slidingDistance,
    refreshText,
  } = state;

  const toSetState = stateHandler(setState);

  loadCountQueue.setHandler((list) => {
    setLoadCount((prevState) => prevState + list.length);
  });

  debounceQueue.setHandler((list) => {
    toSetState((prevState) => {
      let {
        list1: newList1,
        list1Height: newList1Height,
        list2: newList2,
        list2Height: newList2Height,
      } = prevState;
      list.forEach((item) => {
        if (newList1Height < newList2Height) {
          newList1.push(item);
          newList1Height += item?.height;
        } else {
          newList2.push(item);
          newList2Height += item?.height;
        }
      });
      return {
        list1: newList1,
        list1Height: newList1Height,
        list2: newList2,
        list2Height: newList2Height,
      };
    });
  });

  useEffect(() => {
    init().then(masonryHandler).catch(console.log);
  }, []);

  useLayoutEffect(() => {
    if (loadCount !== 0 && loadCount === loadFlag) {
      toSetState({
        moreLoading: false,
      });
      setLoadCount(0);
    }
  }, [loadCount, loadFlag, toSetState]);

  const onLoadMoreHandler = () => {
    if (hasMore) {
      toSetState({
        moreLoading: true,
      });
      onLoadMore(index + 1)
        .then(masonryHandler)
        .catch(console.log);
    }
  };

  const onScrollToUpperHandler = e => {
    onReachTop(e);
  }

  const masonryHandler = async res => {
    if (res?.length > 0) {
      setLoadFlag(res.length);

      toSetState((prevState) => ({
        initLoading: false,
        index: prevState.index + 1,
      }));

      const { screenWidth } = await Taro.getSystemInfoSync();
      const radio = Math.floor(screenWidth / 7.5) / 100;
      const columnWidth = Math.floor((screenWidth - 60 * radio) / 2);

      for (const item of res) {
        Taro.getImageInfo({
          src: item?.url,
          success: (successResult) => {
            debounceQueue.pushTarget({
              ...item,
              width: columnWidth,
              height: Math.ceil(
                successResult?.height * (columnWidth / successResult?.width),
              ),
            });
            loadCountQueue.pushTarget({});
          },
          fail: (failResult) => {
            Taro.getImageInfo({
              src: emptyImage,
              success: (successResult) => {
                debounceQueue.pushTarget({
                  ...item,
                  url: emptyImage,
                  width: columnWidth,
                  height: Math.ceil(
                    successResult?.height * (columnWidth / successResult?.width),
                  ),
                });
                loadCountQueue.pushTarget({});
              },
              fail: (failResult) => {
                debounceQueue.pushTarget({
                  ...item,
                  url: emptyImage,
                  width: columnWidth,
                  height: 240,
                });
                loadCountQueue.pushTarget({});
              },
            });
          },
        });
      }
    } else {
      toSetState({
        initLoading: false,
        moreLoading: false,
        hasMore: false,
      });
    }
  };

  const toRenderItem = (item, i) => {
    const { width, height, url } = item || {};
    return (
      source !== 'result' ?
        <View className='hdz-masonry-list-section-item' style={{ width: width }} key={i}>
          <Image className='hdz-masonry-list-section-image' style={{ width: width, height: height }} src={url} mode='aspectFit' onClick={onImageClick(item)} />
          {render(item, i)}
        </View>
        :
        <View>{render(item, i)}</View>
    );
  };

  const emptyFlag = list1?.length === 0 && list2?.length === 0;

  return (
    <View className='hdz-masonry-list'>
      <ScrollView
        className='hdz-masonry-list-container'
        scrollY
        scrollWithAnimation
        scrollAnchoring
        enableBackToTop
        onScroll={onScroll}
        lowerThreshold={200}
        onScrollToLower={onLoadMoreHandler}
        onScrollToUpper={onScrollToUpperHandler}
      >
        {renderHeader()}
        <View className='hdz-masonry-list-content'>
          {initLoading ? (
            <Loading size={24} />
          ) : emptyFlag ? (
            <Text className='hdz-list-view-more-text'>暂无数据</Text>
          ) : (
                <>
                  <View className='hdz-masonry-list-section'>
                    {list1.map(toRenderItem)}
                  </View>
                  <View className='hdz-masonry-list-section'>
                    {list2.map(toRenderItem)}
                  </View>
                </>
              )}
        </View>
        <View className='hdz-masonry-list-footer'>
          {emptyFlag ? (
            <></>
          ) : moreLoading ? (
            <Loading size={24} />
          ) : hasMore ? (
            <Text
              className='hdz-masonry-list-footer-text'
              onClick={onLoadMoreHandler}
            >
              点击查看更多
            </Text>
          ) : (
                  <Text className='hdz-masonry-list-footer-text'>我也是有底线的</Text>
                )}
        </View>
      </ScrollView>
    </View>
  );
};
